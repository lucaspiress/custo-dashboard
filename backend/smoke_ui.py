import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pagina = browser.new_page(viewport={"width": 1440, "height": 900})
        erros = []
        pagina.on("console", lambda msg: erros.append(msg.text) if msg.type == "error" else None)
        pagina.on("pageerror", lambda err: erros.append(str(err)))

        pagina.goto(BASE + "/login", wait_until="networkidle")
        assert "Custo Dashboard" in pagina.content()
        pagina.fill("input[placeholder='Usuário']", "admin")
        pagina.fill("input[placeholder='Senha']", "admin123456")
        pagina.click("button[type='submit']")
        pagina.wait_for_url("**/", timeout=15000)
        pagina.wait_for_selector("text=Visão Geral", timeout=15000)
        print("LOGIN OK, abas visíveis")

        pagina.wait_for_timeout(1500)
        texto = pagina.inner_text("body")
        assert "SESC PASSO FUNDO" in texto or "SANTA ROSA" in texto, "local carregado?"
        print("DASHBOARD OK")

        abas = ["Custos", "Payback", "Insights", "Comparativo", "Comparar Versões", "Histórico"]
        for aba in abas:
            pagina.click(f"nav button:has-text('{aba}')")
            pagina.wait_for_timeout(1200)
            print(f"ABA {aba} OK")
        if "Usuários" in pagina.inner_text("nav"):
            pagina.click("nav button:has-text('Usuários')")
            pagina.wait_for_timeout(800)
            print("ABA Usuários OK")

        pagina.screenshot(path="preview_dashboard.png", full_page=True)
        browser.close()

        if erros:
            print("ERROS DE CONSOLE:")
            for e in erros:
                print(" -", e)
            sys.exit(1)


if __name__ == "__main__":
    main()
