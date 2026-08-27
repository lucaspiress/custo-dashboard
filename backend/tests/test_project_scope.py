from fixtures import criar_projetos_escopo, projeto_escopo


def _registro_por_numero(registros, numero):
    marcador = projeto_escopo(numero)["nome"]
    return next(registro for registro in registros if registro["fixture"]["nome"] == marcador)


def _dashboard(cliente, registro):
    resposta = cliente.get(f"/api/projetos/{registro['projeto']['id']}")
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_criacao_de_projeto_local_e_item_fica_isolada(cliente, admin):
    registros = criar_projetos_escopo(cliente)

    lista = cliente.get("/api/projetos")
    assert lista.status_code == 200
    assert {projeto["id"] for projeto in lista.json()} == {
        registro["projeto"]["id"] for registro in registros
    }

    for registro in registros:
        dados = _dashboard(cliente, registro)
        fixture = registro["fixture"]

        assert len(dados["locais"]) == 1
        local = dados["locais"][0]
        assert local["id"] == registro["local"]["id"]
        assert local["resumo"]["local"] == fixture["local"]["nome"]
        assert len(local["itens"]) == 1
        assert local["itens"][0]["id"] == registro["item"]["id"]
        assert local["itens"][0]["material"] == fixture["item"]["material"]


def test_atualizacao_de_projeto_local_e_item_nao_vaza_para_outros_escopos(cliente, admin):
    registros = criar_projetos_escopo(cliente)
    alvo = _registro_por_numero(registros, 3)
    vizinho = _registro_por_numero(registros, 4)

    resposta = cliente.patch(
        f"/api/projetos/{alvo['projeto']['id']}",
        json={"nome": "SC001-P03-ATUALIZADO", "cliente": "Cliente atualizado"},
    )
    assert resposta.status_code == 200, resposta.text

    resposta = cliente.patch(
        f"/api/projetos/{alvo['projeto']['id']}/locais/{alvo['local']['id']}",
        json={"nome": "SC001-P03-LOCAL-ATUALIZADO", "valor_mensal": 77777},
    )
    assert resposta.status_code == 200, resposta.text

    resposta = cliente.patch(
        f"/api/projetos/itens/{alvo['item']['id']}",
        json={"material": "SC001-P03-ITEM-ATUALIZADO", "qtd": 99},
    )
    assert resposta.status_code == 200, resposta.text

    dados_alvo = _dashboard(cliente, alvo)
    assert dados_alvo["filename"] == "SC001-P03-ATUALIZADO"
    assert dados_alvo["locais"][0]["resumo"]["local"] == "SC001-P03-LOCAL-ATUALIZADO"
    assert dados_alvo["locais"][0]["resumo"]["valor_mensal"] == 77777
    assert dados_alvo["locais"][0]["itens"][0]["material"] == "SC001-P03-ITEM-ATUALIZADO"
    assert dados_alvo["locais"][0]["itens"][0]["qtd"] == 99

    dados_vizinho = _dashboard(cliente, vizinho)
    fixture_vizinho = vizinho["fixture"]
    assert dados_vizinho["filename"] == fixture_vizinho["nome"]
    assert dados_vizinho["locais"][0]["resumo"]["local"] == fixture_vizinho["local"]["nome"]
    assert dados_vizinho["locais"][0]["resumo"]["valor_mensal"] == fixture_vizinho["local"]["valor_mensal"]
    assert dados_vizinho["locais"][0]["itens"][0]["material"] == fixture_vizinho["item"]["material"]
    assert dados_vizinho["locais"][0]["itens"][0]["qtd"] == fixture_vizinho["item"]["qtd"]


def test_exclusao_de_projeto_local_e_item_fica_isolada(cliente, admin):
    registros = criar_projetos_escopo(cliente)
    alvo_item = _registro_por_numero(registros, 1)
    alvo_local = _registro_por_numero(registros, 2)
    alvo_projeto = _registro_por_numero(registros, 3)
    preservado = _registro_por_numero(registros, 4)

    resposta = cliente.delete(f"/api/projetos/itens/{alvo_item['item']['id']}")
    assert resposta.status_code == 204, resposta.text
    assert _dashboard(cliente, alvo_item)["locais"][0]["itens"] == []

    resposta = cliente.delete(
        f"/api/projetos/{alvo_local['projeto']['id']}/locais/{alvo_local['local']['id']}"
    )
    assert resposta.status_code == 204, resposta.text
    assert _dashboard(cliente, alvo_local)["locais"] == []

    resposta = cliente.delete(f"/api/projetos/{alvo_projeto['projeto']['id']}")
    assert resposta.status_code == 204, resposta.text
    assert cliente.get(f"/api/projetos/{alvo_projeto['projeto']['id']}").status_code == 404

    lista = cliente.get("/api/projetos")
    assert lista.status_code == 200
    assert len(lista.json()) == 9

    dados_preservado = _dashboard(cliente, preservado)
    assert len(dados_preservado["locais"]) == 1
    assert len(dados_preservado["locais"][0]["itens"]) == 1
    assert dados_preservado["locais"][0]["itens"][0]["id"] == preservado["item"]["id"]
