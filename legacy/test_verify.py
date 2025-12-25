from playwright.sync_api import sync_playwright

def verify_settings(page):
    page.set_viewport_size({"width": 1280, "height": 800})
    # Go to Dashboard
    page.goto("http://localhost:5175")
    page.wait_for_selector("#view-dashboard")

    # Check System
    page.click("text=System")
    page.wait_for_selector("#view-settings-system")
    page.screenshot(path="verification/1_system.png")

    # Check TTS
    page.click("text=TTS")
    page.wait_for_selector("#view-settings-tts")
    page.screenshot(path="verification/2_tts.png")

    # Check Gifts
    page.click("text=Gifts / Assets")
    page.wait_for_selector("#view-settings-gifts")
    page.click("text=Open Gift Browser")
    page.wait_for_selector("#modal-gifts.active")
    page.screenshot(path="verification/3_gifts_modal.png")

    # Close Modal (click X button)
    page.click(".modal-header .btn-icon")
    page.wait_for_function("!document.getElementById(\"modal-gifts\").classList.contains(\"active\")")

    # Check Users
    page.click("text=User DB")
    page.wait_for_selector("#view-users")
    page.screenshot(path="verification/4_users.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_settings(page)
            print("Screenshots taken")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
