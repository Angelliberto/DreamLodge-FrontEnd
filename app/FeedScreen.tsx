import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { NavigationBar } from '../src/components/NavigationBar';
import { ArtworkCard } from '../src/components/feed/ArtworkCard';
import { FeedHeader } from '../src/components/feed/FeedHeader';
import { FeedRecommendationsLoader } from '../src/components/feed/FeedRecommendationsLoader';
import { RecommendationSection } from '../src/components/feed/RecommendationSection';
import { SearchFeedModal } from '../src/components/feed/SearchFeedModal';
import { FILTER_CATEGORIES } from '../src/components/feed/feedCategories';
import { FEED_GRID_GAP } from '../src/components/feed/feedConstants';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { useFeedScreenController } from '../src/hooks/useFeedScreenController';
import { CulturalItem } from '@/types/CulturalItem';

export default function UnifiedFeedScreen() {
  const router = useRouter();
  const {
    showSearchScreen,
    setShowSearchScreen,
    query,
    setQuery,
    loading,
    awaitingOceanFeed,
    searchLoading,
    refreshingFeed,
    hasSearched,
    selectedCategories,
    hasActiveFilters,
    favoriteIds,
    pendingIds,
    updatingItems,
    filteredItems,
    filteredSearchItems,
    principalRecommendations,
    favoritesRecommendationLine,
    recommendationsByCategory,
    feedCardWidth,
    feedPosterHeight,
    recommendationCardWidth,
    recommendationPosterHeight,
    toggleCategory,
    handleToggleFavorite,
    handleTogglePending,
    getCategoryIcon,
    getCategoryColor,
    getCinemaTypeLabel,
    triggerImmediateSearch,
    refreshFeed,
  } = useFeedScreenController(FILTER_CATEGORIES);

  const handlePress = useCallback((item: CulturalItem) => {
      // Navigate to details page passing all item information
      router.push({
          pathname: '/artwork-details',
          params: { 
            id: item.id,
            source: item.source,
            originalId: String(item.originalId),
            // Pass basic data as JSON string to avoid serialization issues
            itemData: JSON.stringify(item)
          }
      });
  }, [router]);

  // Keep render memoized for search grid performance.
  const renderItem = useCallback(({ item, index }: { item: CulturalItem; index: number }) => {
    const CategoryIcon = getCategoryIcon(item.category);
    const categoryColor = getCategoryColor(item.category);
    const isFavorite = favoriteIds.has(item.id);
    const isPending = pendingIds.has(item.id);
    const isUpdatingFavorite = updatingItems.has(`fav-${item.id}`);
    const isUpdatingPending = updatingItems.has(`pend-${item.id}`);
    const cinemaTypeLabel = getCinemaTypeLabel(item);
    const totalItems = showSearchScreen ? filteredSearchItems.length : filteredItems.length;
    const isLonelyLast = totalItems % 2 === 1 && index === totalItems - 1;
    return (
      <ArtworkCard
        item={item}
        width={feedCardWidth}
        height={feedPosterHeight}
        marginRight={index % 2 === 0 && !isLonelyLast ? FEED_GRID_GAP : 0}
        categoryColor={categoryColor}
        CategoryIcon={CategoryIcon}
        cinemaTypeLabel={cinemaTypeLabel}
        isFavorite={isFavorite}
        isPending={isPending}
        isUpdatingFavorite={isUpdatingFavorite}
        isUpdatingPending={isUpdatingPending}
        onPress={handlePress}
        onToggleFavorite={handleToggleFavorite}
        onTogglePending={handleTogglePending}
      />
    );
  }, [
    feedCardWidth,
    feedPosterHeight,
    getCategoryIcon,
    getCategoryColor,
    favoriteIds,
    pendingIds,
    updatingItems,
    handlePress,
    handleToggleFavorite,
    handleTogglePending,
    getCinemaTypeLabel,
    filteredItems.length,
    filteredSearchItems.length,
    showSearchScreen,
  ]);

  return (
    <BackgroundLayout> 
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        
        <NavigationBar variant="simple" showAuth={false} showLogout={false} />

        <FeedHeader
          onPressSearch={() => setShowSearchScreen(true)}
          onPressRefresh={refreshFeed}
          refreshing={refreshingFeed}
        />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {loading || awaitingOceanFeed ? (
            <View className="min-h-[420px] flex-1 items-center justify-center px-4 py-16">
              <FeedRecommendationsLoader
                headline={
                  awaitingOceanFeed && !loading
                    ? 'Generando recomendaciones para ti'
                    : 'Cargando recomendaciones'
                }
              />
            </View>
          ) : (
            <>

              {principalRecommendations.length > 0 ? (
                <RecommendationSection
                  title="Recomendación principal"
                  items={principalRecommendations}
                  itemWidth={recommendationCardWidth}
                  itemHeight={recommendationPosterHeight}
                  getCategoryIcon={getCategoryIcon}
                  getCategoryColor={getCategoryColor}
                  getCinemaTypeLabel={getCinemaTypeLabel}
                  favoriteIds={favoriteIds}
                  pendingIds={pendingIds}
                  updatingItems={updatingItems}
                  onPressItem={handlePress}
                  onToggleFavorite={handleToggleFavorite}
                  onTogglePending={handleTogglePending}
                />
              ) : null}
              {favoritesRecommendationLine.length > 0 ? (
                <RecommendationSection
                  title="Recomendados por tus favoritos"
                  items={favoritesRecommendationLine}
                  itemWidth={recommendationCardWidth}
                  itemHeight={recommendationPosterHeight}
                  getCategoryIcon={getCategoryIcon}
                  getCategoryColor={getCategoryColor}
                  getCinemaTypeLabel={getCinemaTypeLabel}
                  favoriteIds={favoriteIds}
                  pendingIds={pendingIds}
                  updatingItems={updatingItems}
                  onPressItem={handlePress}
                  onToggleFavorite={handleToggleFavorite}
                  onTogglePending={handleTogglePending}
                  showCount
                />
              ) : null}

              {recommendationsByCategory.map((section) => {
                  return (
                    <RecommendationSection
                      key={section.key}
                      title={section.label}
                      items={section.data}
                      itemWidth={recommendationCardWidth}
                      itemHeight={recommendationPosterHeight}
                      getCategoryIcon={getCategoryIcon}
                      getCategoryColor={getCategoryColor}
                      getCinemaTypeLabel={getCinemaTypeLabel}
                      favoriteIds={favoriteIds}
                      pendingIds={pendingIds}
                      updatingItems={updatingItems}
                      onPressItem={handlePress}
                      onToggleFavorite={handleToggleFavorite}
                      onTogglePending={handleTogglePending}
                      leftIcon={section.icon}
                      showCount
                    />
                  );
              })}

              {!loading && filteredItems.length === 0 ? (
                <View className="px-4 py-12 items-center">
                  <Text className="text-center text-slate-500 text-lg mb-2">
                    Sin recomendaciones disponibles
                  </Text>
                  <Text className="text-center text-slate-600 text-sm">
                    Usa el ícono de búsqueda para encontrar contenido.
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <SearchFeedModal
          visible={showSearchScreen}
          onClose={() => setShowSearchScreen(false)}
          query={query}
          onChangeQuery={setQuery}
          onSubmitSearch={triggerImmediateSearch}
          searchLoading={searchLoading}
          hasSearched={hasSearched}
          filteredSearchItems={filteredSearchItems}
          hasActiveFilters={hasActiveFilters}
          feedPosterHeight={feedPosterHeight}
          renderItem={renderItem}
          listExtraData={{ favoriteIds, pendingIds, updatingItems }}
          filterCategories={FILTER_CATEGORIES}
          selectedCategories={selectedCategories}
          toggleCategory={toggleCategory}
        />

        <BottomNavigation />
      </SafeAreaView>
    </BackgroundLayout>
  );
}