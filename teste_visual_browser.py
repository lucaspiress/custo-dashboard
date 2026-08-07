import sys

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
        page.wait_for_selector(".kpi-card", timeout=30000)
        page.wait_for_timeout(2500)
        page.screenshot(path=r"C:\Users\assistentesolucoes\Desktop\custo-dashboard\preview_geral.png")
        print("1. Visão Geral renderizada")

        kpi_inicial = page.locator(".kpi-value").first.inner_text()
        print("2. KPI inicial:", kpi_inicial)

        sel = page.locator("[data-testid='stSelectbox']").nth(0)
        sel.click()
        page.wait_for_timeout(800)
        opcoes = page.locator("[role='option']")
        print("3. Opcoes do seletor:", opcoes.count())
        nomes = [op.inner_text() for op in opcoes.all()]
        print("   ", nomes[:4])
        alvo = opcoes.filter(has_text="opencode base.xlsx").first
        if alvo.count():
            alvo.click()
            page.wait_for_timeout(7000)
            kpi_novo = page.locator(".kpi-value").first.inner_text()
            fonte_nova = page.locator(".cabecalho-fonte").inner_text()
            print("4. Troca p/ opencode base -> KPI:", kpi_novo, "| mudou:", kpi_novo != kpi_inicial, "|", fonte_nova)
            if "opencode base.xlsx" not in fonte_nova:
                raise AssertionError("O seletor de snapshot não trocou para opencode base")

        abas = page.locator("[role='tab']")
        abas.nth(3).click()
        page.wait_for_timeout(2000)
        page.screenshot(path=r"C:\Users\assistentesolucoes\Desktop\custo-dashboard\preview_insights.png")
        print("5. Insights renderizada")

        abas.nth(1).click()
        page.wait_for_timeout(2000)
        page.screenshot(path=r"C:\Users\assistentesolucoes\Desktop\custo-dashboard\preview_custos.png")
        print("6. Custos renderizada")

        print("7. Erros de console:", len(erros_console))
        for e in erros_console:
            print("   ", e[:160])
        browser.close()
        if erros_console:
            sys.exit(1)


if __name__ == "__main__":
    main()
