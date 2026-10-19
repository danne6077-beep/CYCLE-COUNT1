package ph.fuji.grocery.data

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

private val Context.settingsStore by preferencesDataStore("fuji_settings")
data class Preferences(val welcomed: Boolean = false, val theme: String = "dark",
    val dynamicColor: Boolean = false, val budget: Long = 0, val favorites: Set<String> = emptySet(),
    val recent: List<String> = emptyList())

interface PreferenceStore {
    val flow: Flow<Preferences>
    suspend fun welcome()
    suspend fun theme(value: String)
    suspend fun dynamic(value: Boolean)
    suspend fun budget(value: Long)
    suspend fun favorite(sku: String)
    suspend fun recent(query: String)
    suspend fun clearRecent()
    suspend fun reset()
}
@Singleton
class Settings @Inject constructor(@ApplicationContext context: Context) : PreferenceStore {
    private val store = context.settingsStore
    private val welcomed = booleanPreferencesKey("welcomed")
    private val theme = stringPreferencesKey("theme")
    private val dynamic = booleanPreferencesKey("dynamic")
    private val budget = longPreferencesKey("budget")
    private val favorites = stringSetPreferencesKey("favorites")
    private val recent = stringPreferencesKey("recent")
    override val flow: Flow<Preferences> = store.data.catch { if (it is IOException) emit(emptyPreferences()) else throw it }.map {
        Preferences(it[welcomed] ?: false, it[theme] ?: "dark", it[dynamic] ?: false,
            it[budget] ?: 0, it[favorites] ?: emptySet(), it[recent]?.split('\n')?.filter(String::isNotBlank) ?: emptyList())
    }
    override suspend fun welcome() { store.edit { it[welcomed] = true } }
    override suspend fun theme(value: String) { require(value in setOf("system", "light", "dark")); store.edit { it[theme] = value } }
    override suspend fun dynamic(value: Boolean) { store.edit { it[dynamic] = value } }
    override suspend fun budget(value: Long) { require(value in 0..999_999_999L); store.edit { it[budget] = value } }
    override suspend fun favorite(sku: String) { store.edit {
        val set = (it[favorites] ?: emptySet()).toMutableSet()
        if (!set.add(sku)) set.remove(sku)
        it[favorites] = set
    } }
    override suspend fun recent(query: String) { if (query.isBlank()) return; store.edit {
        it[recent] = (listOf(query.take(100).replace('\n', ' ')) + (it[recent]?.split('\n') ?: emptyList()))
            .distinct().take(8).joinToString("\n")
    } }
    override suspend fun clearRecent() { store.edit { it.remove(recent) } }
    override suspend fun reset() { store.edit { it.clear(); it[welcomed] = true } }
}
