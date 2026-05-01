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
    <View className="px-4 pt-4 pb-2">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="w-11 h-11 rounded-xl border border-slate-600 bg-slate-800/85 items-center justify-center"
          onPress={onPressSearch}
          activeOpacity={0.85}
        >
          <Search size={20} color="#e2e8f0" />
        </TouchableOpacity>
        <TouchableOpacity
          className="h-11 rounded-xl border border-slate-600 bg-slate-800/85 px-3 flex-row items-center justify-center"
          onPress={onPressRefresh}
          activeOpacity={0.85}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#cbd5e1" />
          ) : (
            <RefreshCw size={16} color="#cbd5e1" />
          )}
          <Text className="ml-2 text-slate-200 text-xs font-semibold">Refrescar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
