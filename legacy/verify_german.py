from playwright.sync_api import sync_playwright

def verify_german_spa():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to SPA
        page.goto("http://localhost:5175/")

        # 1. Dashboard View
        page.wait_for_selector("#view-dashboard.active")
        assert page.get_by_text("TK ZENTRALE").is_visible()
        assert page.get_by_text("Live Übersicht").is_visible()

        page.screenshot(path="verification/german_dashboard.png")
        print("Captured german_dashboard.png")

        # 2. Settings View
        page.locator("#nav-settings").click()
        page.wait_for_selector("#view-settings.active")

        # Check specific German labels
        assert page.get_by_text("System Einstellungen").is_visible()
        assert page.get_by_text("Punktesystem").is_visible()
        assert page.get_by_label("Punkte pro Nachricht").is_visible()

        # Check default value loading (chat points = 5)
        # Note: We need to wait for fetch to complete filling the inputs
        # The script does loadSettings() on view switch.
        page.wait_for_function("document.getElementById('conf-chat').value != ''")
        val = page.locator("#conf-chat").input_value()
        assert val == "5", f"Expected 5, got {val}"

        page.screenshot(path="verification/german_settings.png")
        print("Captured german_settings.png")

        # 3. User DB View
        page.locator("#nav-users").click()
        page.wait_for_selector("#view-users.active")

        assert page.get_by_text("Benutzer Datenbank").is_visible()
        # Wait for table
        page.wait_for_selector("#user-table-body")

        page.screenshot(path="verification/german_users.png")
        print("Captured german_users.png")

        browser.close()

if __name__ == "__main__":
    verify_german_spa()
