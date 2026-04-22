import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Category } from '@src/Types/types';
import { groceryTheme } from '@src/Utils/groceryTheme';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId?: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.chip,
          !selectedCategoryId && styles.chipSelected,
        ]}
        onPress={() => onSelectCategory(undefined)}
      >
        <Text
          style={[
            styles.chipText,
            !selectedCategoryId && styles.chipTextSelected,
          ]}
        >
          All
        </Text>
      </TouchableOpacity>
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.chip,
            selectedCategoryId === category.id && styles.chipSelected,
          ]}
          onPress={() => onSelectCategory(category.id)}
        >
          <Text
            style={[
              styles.chipText,
              selectedCategoryId === category.id && styles.chipTextSelected,
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: groceryTheme.radius.full,
    backgroundColor: groceryTheme.colors.surface,
    borderWidth: 1,
    borderColor: groceryTheme.colors.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: groceryTheme.colors.brand,
    borderColor: groceryTheme.colors.brand,
  },
  chipText: {
    fontSize: 14,
    color: groceryTheme.colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: groceryTheme.colors.inverse,
  },
});

export default CategoryFilter;
