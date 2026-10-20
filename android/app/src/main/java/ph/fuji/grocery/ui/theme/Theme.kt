package ph.fuji.grocery.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ph.fuji.grocery.R

object FujiSpace { val small = 8.dp; val medium = 16.dp; val large = 24.dp; val corner = 16.dp; val touch = 48.dp }
private val darkColors = darkColorScheme(primary = Color(0xFF9DE4B7), onPrimary = Color(0xFF123C29),
    secondary = Color(0xFFCFDDA8), background = Color(0xFF0A0A0A), surface = Color(0xFF151916),
    onSurface = Color(0xFFF0F3EE), surfaceContainer = Color(0xFF202821), error = Color(0xFFFFB4AB))
private val lightColors = lightColorScheme(primary = Color(0xFF225E3F), onPrimary = Color.White,
    secondary = Color(0xFF536638), background = Color(0xFFF6F8F2), surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1B271F), surfaceContainer = Color(0xFFEDF1E8))
private val inter = FontFamily(Font(R.font.inter, FontWeight.Normal))
private val typography = Typography(
    headlineLarge = TextStyle(fontFamily = inter, fontWeight = FontWeight.Bold, fontSize = 32.sp, lineHeight = 38.sp),
    headlineMedium = TextStyle(fontFamily = inter, fontWeight = FontWeight.Bold, fontSize = 26.sp, lineHeight = 32.sp),
    titleLarge = TextStyle(fontFamily = inter, fontWeight = FontWeight.SemiBold, fontSize = 21.sp, lineHeight = 28.sp),
    titleMedium = TextStyle(fontFamily = inter, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 23.sp),
    bodyLarge = TextStyle(fontFamily = inter, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = inter, fontSize = 14.sp, lineHeight = 21.sp),
    labelLarge = TextStyle(fontFamily = inter, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp))
@Composable fun FujiTheme(theme: String = "dark", dynamic: Boolean = false, content: @Composable () -> Unit) {
    val dark = theme == "dark" || (theme == "system" && isSystemInDarkTheme())
    val colors = if (dynamic && Build.VERSION.SDK_INT >= 31) {
        if (dark) dynamicDarkColorScheme(LocalContext.current) else dynamicLightColorScheme(LocalContext.current)
    } else if (dark) darkColors else lightColors
    MaterialTheme(colorScheme = colors, typography = typography, content = content)
}
