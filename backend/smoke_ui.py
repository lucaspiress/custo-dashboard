import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

import planilha_teste

BASE = "http://localhost:5173"


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        arquivo = planilha_teste.salvar_planilha_teste(Path(tmp) / "teste.xlsx")

        with sync_playwright() as p:
            browser = p.chromium.launch()
            pagina = browser.new_page(viewport={"width": 1440, "height": 900})
            erros = []
            pagina.on(
                "console",
                lambda msg: erros.append(msg.text)
                if msg.type == "error" and "401" not in msg.text
                else None,
            )
            pagina.on("pageerror", lambda err: erros.append(str(err)))

            pagina.goto(BASE + "/login", wait_until="networkidle")
            assert "Custo Dashboard" in pagina.content()
            pagina.fill("#idOperador", "admin")
            pagina.fill("#senha", "admin123456")
            pagina.click("button[type='submit']")
            pagina.wait_for_url("**/", timeout=20000)
            pagina.wait_for_selector("text=Visão Geral", timeout=20000)
            print("LOGIN OK, abas visíveis")

            pagina.wait_for_timeout(1500)
            texto = pagina.inner_text("body")
            assert "Nenhuma análise carregada" in texto, "estado vazio esperado"
            print("ESTADO VAZIO OK")

            pagina.set_input_files("input[type='file']", str(arquivo))
            pagina.wait_for_selector("text=Exibindo:", timeout=30000)
            print("UPLOAD OK")

            pagina.wait_for_timeout(1500)
            texto = pagina.inner_text("body")
            assert "SESC TESTE" in texto and "UNIDADE B" in texto, "local carregado?"
            print("DASHBOARD OK")

            abas = ["Custos", "Payback", "Insights", "Comparativo"]
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
