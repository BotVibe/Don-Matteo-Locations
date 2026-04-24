from playwright.sync_api import sync_playwright, expect
import os
import signal
import subprocess
import time
import sys

def run_tests():
    # Start local server
    server_process = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(2)  # Give server time to start

    success = True
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Block external resources
            def handle_route(route):
                if "localhost" in route.request.url:
                    route.continue_()
                else:
                    route.abort()
            page.route("**/*", handle_route)

            print("Navigating to http://localhost:8000")
            page.goto("http://localhost:8000", wait_until="commit")

            # Wait for showDetails to be defined (from script.js)
            page.wait_for_function("typeof window.showDetails === 'function'", timeout=10000)

            # Inject mock data into the real app
            page.evaluate("""
                window.appData = {
                    locations: [
                        {
                            id: 'test_id',
                            name: 'Test Location',
                            image: '',
                            description: 'Test Description',
                            background: 'Test Background',
                            source: 'Test Source',
                            reliability: 'High'
                        }
                    ]
                };
            """)

            details_container = page.locator("#details-container")

            # 1. Test Edge Case: Invalid ID
            print("Testing edge case: invalid ID...")
            expect(details_container).to_have_class("hidden")
            page.evaluate("window.showDetails('invalid_id')")
            expect(details_container).to_have_class("hidden")
            print("Edge case passed!")

            # 2. Test Happy Path: Valid ID
            print("Testing happy path: valid ID...")
            page.evaluate("window.showDetails('test_id')")
            expect(details_container).not_to_have_class("hidden")
            expect(page.locator("#details-name")).to_have_text("Test Location")
            print("Happy path passed!")

            browser.close()

    except Exception as e:
        print(f"Tests failed: {e}")
        success = False
    finally:
        # Kill server
        os.kill(server_process.pid, signal.SIGTERM)

    return success

if __name__ == "__main__":
    if run_tests():
        print("All tests passed successfully!")
        sys.exit(0)
    else:
        print("Some tests failed.")
        sys.exit(1)
