package ph.fuji.grocery.di

import android.content.Context
import androidx.room.Room
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import ph.fuji.grocery.data.*
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides @Singleton fun database(@ApplicationContext context: Context): FujiDatabase =
        Room.databaseBuilder(context, FujiDatabase::class.java, "fuji.db").build()
}
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds abstract fun repository(local: LocalRepository): ShopRepository
    @Binds abstract fun preferences(settings: Settings): PreferenceStore
}
