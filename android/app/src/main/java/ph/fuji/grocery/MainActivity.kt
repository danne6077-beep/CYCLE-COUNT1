package ph.fuji.grocery

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.AndroidEntryPoint
import ph.fuji.grocery.ui.FujiApp
import ph.fuji.grocery.ui.ShopperViewModel
import ph.fuji.grocery.ui.theme.FujiTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val viewModel: ShopperViewModel by viewModels()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val preferences by viewModel.preferences.collectAsStateWithLifecycle()
            FujiTheme(preferences?.theme ?: "dark", preferences?.dynamicColor ?: false) { FujiApp(viewModel) }
        }
    }
}
