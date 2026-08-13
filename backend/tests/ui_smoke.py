from playwright.sync_api import expect, sync_playwright


BASE_URL = "http://127.0.0.1:5173"


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        projeto_id: str | None = None
        try:
            page.goto(BASE_URL, wait_until="networkidle")
            page.locator("#idOperador").fill("admin")
            page.locator("#senha").fill("admin123456")
            page.get_by_role("button", name="Autenticar").click()
            page.wait_for_url(f"{BASE_URL}/")

            page.get_by_role("button", name="Novo projeto").click()
            page.get_by_placeholder("Ex.: Cliente X — Filiais 2026").fill("Projeto teste de interface")
            page.get_by_role("button", name="Salvar").click()
            page.wait_for_url(f"{BASE_URL}/projetos/*", wait_until="networkidle")
            projeto_id = page.url.rstrip("/").split("/")[-1]

            page.get_by_role("link", name="Editar dados").click()
            page.wait_for_url(f"{BASE_URL}/projetos/{projeto_id}/planilha", wait_until="networkidle")
            page.get_by_role("button", name="+ Local").click()
            page.get_by_text("Novo local", exact=True).click()
            page.locator("input[autocomplete='off']").fill("Filial teste")
            page.locator("input[autocomplete='off']").press("Enter")
            expect(page.get_by_text("Alterações salvas", exact=True)).to_be_visible(timeout=5_000)

            page.reload(wait_until="domcontentloaded")
            expect(page.get_by_text("Filial teste", exact=True)).to_be_visible(timeout=15_000)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
