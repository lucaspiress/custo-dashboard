from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = Path(__file__).parent / "previews"
OUT.mkdir(exist_ok=True)


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pagina = browser.new_page(viewport={"width": 1440, "height": 900})
        recursos = []
        pagina.on("requestfailed", lambda req: recursos.append(f"FAIL {req.url}"))
        pagina.on(
            "response",
            lambda resp: recursos.append(f"{resp.status} {resp.url}")
            if resp.status in (401, 404, 500)
            else None,
        )

        pagina.goto(BASE + "/login", wait_until="networkidle")
        pagina.wait_for_timeout(1200)
        pagina.screenshot(path=str(OUT / "login.png"))
        print("LOGIN salvo")

        pagina.fill("#idOperador", "admin")
        pagina.fill("#senha", "admin123456")
        pagina.click("button[type='submit']")
        pagina.wait_for_url("**/", timeout=20000)
        pagina.wait_for_selector("text=Visão Geral", timeout=20000)
        pagina.wait_for_timeout(2500)
        pagina.screenshot(path=str(OUT / "dashboard.png"), full_page=True)
        print("DASHBOARD salvo")

        print("REQUISICOES PROBLEMATICAS:")
        for r in recursos:
            print(" -", r)

        browser.close()


if __name__ == "__main__":
    main()
