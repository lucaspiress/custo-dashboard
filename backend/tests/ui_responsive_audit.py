from playwright.sync_api import expect, sync_playwright


BASE_URL = "http://127.0.0.1:5173"


def verificar_foco_e_largura(page) -> None:
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    for _ in range(3):
        page.keyboard.press("Tab")
        assert page.evaluate(
            "document.activeElement.matches('a, button, input, select, textarea, [tabindex]:not([tabindex=\"-1\"])')"
        )


def verificar_responsividade(page, largura: int, nome_projeto: str) -> None:
    try:
        page.set_viewport_size({"width": largura, "height": 812})
        expect(page.get_by_role("link", name="Editar dados")).to_be_visible(timeout=15_000)
        verificar_foco_e_largura(page)

        page.get_by_role("link", name="Editar dados").click()
        expect(page.get_by_role("heading", name="Planilha de dados")).to_be_visible(timeout=15_000)
        verificar_foco_e_largura(page)

        page.get_by_role("link", name="Voltar aos projetos").click()
        expect(page.get_by_role("button", name="Novo projeto")).to_be_visible(timeout=15_000)
        verificar_foco_e_largura(page)

        page.get_by_role("button", name=nome_projeto, exact=True).click()
        expect(page.get_by_role("link", name="Editar dados")).to_be_visible(timeout=15_000)
    finally:
        page.set_viewport_size({"width": 1440, "height": 900})


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.set_viewport_size({"width": 1440, "height": 900})
            page.goto(BASE_URL, wait_until="networkidle")
            page.locator("#idOperador").fill("admin")
            page.locator("#senha").fill("admin123456")
            page.get_by_role("button", name="Autenticar").click()
            expect(page.get_by_role("button", name="Novo projeto")).to_be_visible()
            page.get_by_role("button", name="Novo projeto").click()
            nome_projeto = "Projeto auditoria responsiva"
            page.locator("input:not([type=file])").first.fill(nome_projeto)
            page.get_by_role("button", name="Salvar").click()
            page.wait_for_url(f"{BASE_URL}/projetos/*", wait_until="networkidle")
            projeto_url = page.url

            for largura in (375, 768):
                verificar_responsividade(page, largura, nome_projeto)
        finally:
            page.close()
            context.close()
            browser.close()


if __name__ == "__main__":
    main()
