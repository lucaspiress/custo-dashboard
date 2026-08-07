import sys
import time

from playwright.sync_api import sync_playwright

URL = "http://localhost:8501"

erros_console = []


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda msg: erros_console.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: erros_console.append(f"PAGEERROR: {err}"))

        page.goto(URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(4000)

        page.screenshot(path=r"C:\Users\assistentesolucoes\Desktop\custo-dashboard\preview_geral.png", full_page=False)
        print("1. Screenshot Visão Geral salvo")

        conteudo = page.content()
        checks = {
            "cabeçalho com marca": "cabecalho-marca" in conteudo,
            "kpi cards": "kpi-card" in conteudo,
            "tabs": "Visão Geral" in conteudo and "Histórico" in conteudo,
        }
        for nome, ok in checks.items():
            print(f"   {nome}: {'OK' if ok else 'FALHOU'}")

        abas = page.locator("[role='tab']")
        print(f"2. Abas encontradas: {abas.count()}")
        if abas.count() >= 4:
            abas.nth(3).click()
            page.wait_for_timeout(2500)
            page.screenshot(path=r"C:\Users\assistentesolucoes\Desktop\custo-dashboard\preview_insights.png", full_page=False)
            print("3. Screenshot Insights salvo")
        if abas.count() >= 2:
            abas.nth(1).click()
            page.wait_for_timeout(2500)
            page.screenshot(path=r"C:\Users\assistentesolucoes\Desktop\custo-dashboard\preview_custos.png", full_page=False)
            print("4. Screenshot Custos salvo")

        erros = [e for e in erros_console]
        print(f"5. Erros de console: {len(erros)}")
        for e in erros:
            print("   ", e[:200])

        browser.close()
        if erros:
            sys.exit(1)


if __name__ == "__main__":
    main()
