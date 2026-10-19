package ph.fuji.grocery

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ShopperFlowTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()
    @Test fun browsePriceBasketBudgetShelfEntryAndTrip() {
        rule.waitUntil(60000) { rule.onAllNodesWithText("Next", useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty() || rule.onAllNodesWithText("Search product, SKU or category").fetchSemanticsNodes().isNotEmpty() }
        if (rule.onAllNodesWithText("Next").fetchSemanticsNodes().isNotEmpty()) {
            rule.onNodeWithText("Next").performClick(); rule.waitForIdle()
            rule.onNodeWithText("Next").performClick(); rule.waitForIdle()
            rule.onNodeWithText("Start shopping").performClick()
        }
        rule.onNodeWithText("Search product, SKU or category").performTextInput("486522")
        rule.waitUntil(15000) { rule.onAllNodesWithText("₱14.05").fetchSemanticsNodes().isNotEmpty() }
        rule.onNodeWithText("₱14.05").assertIsDisplayed()
        rule.onNodeWithText("Add", substring = false).performClick()
        rule.onNodeWithText("Basket", substring = false).performClick()
        rule.onNodeWithText("Set a trip budget").performClick()
        rule.onNodeWithText("Amount in pesos").performTextInput("20")
        rule.onNodeWithText("Save", substring = false).performClick()
        rule.onNodeWithContentDescription("Increase quantity").performClick()
        rule.onNodeWithText("Over budget", substring = false).assertIsDisplayed()
        rule.onNodeWithText("Edit shelf price").performScrollTo().performClick()
        rule.onNodeWithText("Amount in pesos").performTextReplacement("15.01")
        rule.onNodeWithText("Save", substring = false).performClick()
        rule.onAllNodesWithText("₱30.02").onFirst().assertIsDisplayed()
        rule.onNodeWithText("Save finished trip").performScrollTo().performClick()
        rule.onNodeWithText("Save finished trip").performClick()
        rule.waitUntil(10000) { rule.onAllNodesWithText("Your next good shop starts here.").fetchSemanticsNodes().isNotEmpty() }
        rule.onNodeWithContentDescription("Past trips").performClick()
        rule.onNodeWithText("₱30.02", substring = false).assertIsDisplayed()
        rule.onNodeWithText(rule.activity.getString(R.string.price_warning)).assertIsDisplayed()
    }
}
