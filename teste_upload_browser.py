import sys
import time

from playwright.sync_api import sync_playwright

URL = "http://localhost:8501"
ARQUIVO = r"C:\Users\assistentesolucoes\Downloads\1- CUSTOS DISPENSA ELETRÔNICA 9074-2026 (14ª CRS SANTA ROSA ) RETORNO 20 MESES.xlsx"

erros_console = []


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: erros_console.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: erros_console.append(f"PAGEERROR: {err}"))

        print("1. Abrindo app...")
        page.goto(URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)

        print("2. Procurando input de upload...")
        input_arquivo = page.locator("input[type='file']")
        assert input_arquivo.count() > 0, "input de arquivo nao encontrado"
        input_arquivo.set_input_files(ARQUIVO)
        print("   Arquivo enviado, aguardando processamento...")
        page.wait_for_timeout(8000)

        conteudo = page.content()
        if "14ª CRS SANTA ROSA" in conteudo or "CRS SANTA ROSA" in conteudo:
            print("3. OK: dashboard mostrando dados da nova planilha (CRS SANTA ROSA)")
        else:
            print("3. ATENCAO: dados da nova planilha nao encontrados na pagina")

        page.screenshot(path=r"C:\Users\assistentesolucoes\Desktop\custo-dashboard\teste_upload.png", full_page=True)
        print("4. Screenshot salvo")

        erros_filtrados = [e for e in erros_console if "removeChild" in e or "NotFoundError" in e]
        print("5. Erros removeChild/NotFoundError:", len(erros_filtrados))
        for e in erros_filtrados:
            print("   ", e[:200])
        print("6. Total de erros de console:", len(erros_console))
        for e in erros_console:
            if "removeChild" not in e and "NotFoundError" not in e:
                print("   ", e[:200])

        browser.close()
        if erros_filtrados:
            sys.exit(1)


if __name__ == "__main__":
    main()
