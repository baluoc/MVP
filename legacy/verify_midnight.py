from playwright.sync_api import sync_playwright

def verify_midnight_command():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to SPA
        page.goto("http://localhost:5175/")

        # --- 1. Live Dashboard (Default View) ---
        page.wait_for_selector("#view-live.active")
        # Check for 3-column layout elements
        assert page.locator(".col-chat").is_visible()
        assert page.locator(".col-preview").is_visible()
        assert page.locator(".col-events").is_visible()
        # Screenshot Live View
        page.screenshot(path="verification/midnight_live.png")
        print("Captured midnight_live.png")

        # --- 2. Settings View ---
        page.get_by_role("button", name="Settings").click()
        page.wait_for_selector("#view-settings.active")

        # Verify detailed fields
        assert page.locator("#conf-pts-chat").is_visible()
        # Verify step attribute is 0.1
        val = page.locator("#conf-pts-chat").get_attribute("step")
        assert val == "0.1", f"Expected step 0.1, got {val}"

        assert page.locator("#conf-lvl-mult").is_visible()
        assert page.locator("#conf-tts-minlvl").is_visible()

        page.screenshot(path="verification/midnight_settings.png")
        print("Captured midnight_settings.png")

        # --- 3. Overlay Editor ---
        page.get_by_role("button", name="Overlay Editor").click()
        page.wait_for_selector("#view-composer.active")
        page.wait_for_selector(".comp-widget") # Ensure widgets rendered
        page.screenshot(path="verification/midnight_composer.png")
        print("Captured midnight_composer.png")

        # --- 4. User DB ---
        page.get_by_role("button", name="User DB").click()
        page.wait_for_selector("#view-users.active")
        # Wait for table rows
        page.wait_for_selector("#user-table tbody tr", timeout=5000)
        page.screenshot(path="verification/midnight_users.png")
        print("Captured midnight_users.png")

        browser.close()

if __name__ == "__main__":
    verify_midnight_command()
