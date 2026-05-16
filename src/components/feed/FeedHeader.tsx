import { RefreshCw, Search } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

type FeedHeaderProps = {
  onPressSearch: () => void;
  onPressRefresh: () => void;
  refreshing?: boolean;
};

export function FeedHeader({
  onPressSearch,
  onPressRefresh,
  refreshing = false,
}: FeedHeaderProps) {
  return (
    <View className="px-4 pt-3 pb-2">
      <View className="flex-row overflow-hidden rounded-2xl border border-purple-500/25 bg-slate-950/70">
        <TouchableOpacity
          className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 py-3"
          onPress={onPressSearch}
          activeOpacity={0.75}
        >
          <Search size={20} color="#e9d5ff" />
          <Text className="text-sm font-semibold text-slate-100">Buscar</Text>
        </TouchableOpacity>
        <View className="my-2.5 w-px self-stretch bg-white/12" />
        <TouchableOpacity
          className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 py-3"
          onPress={onPressRefresh}
          activeOpacity={0.75}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#e9d5ff" />
          ) : (
            <RefreshCw size={18} color="#e9d5ff" />
          )}
          <Text className="text-sm font-semibold text-slate-100">Refrescar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
