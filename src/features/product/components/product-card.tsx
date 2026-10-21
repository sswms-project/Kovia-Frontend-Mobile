import { Image } from 'expo-image';
import { Package } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantity } from '@/lib/number-format';

import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_TONE } from '../product.labels';
import type { ProductListItem } from '../product.types';

const THUMBNAIL_SIZE = 56;

interface ProductCardProps {
  readonly product: ProductListItem;
  /** False hides the stock line for users without inventory permission. */
  readonly showStock: boolean;
  readonly onPress: () => void;
}

export function ProductCard({ product, showStock, onPress }: ProductCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.productName}, mã ${product.sku}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      {product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
          accessibilityLabel={`Ảnh ${product.productName}`}
          contentFit="cover"
          style={[styles.thumbnail, { borderColor: theme.border }]}
        />
      ) : (
        <View style={[styles.thumbnail, styles.placeholder, { backgroundColor: theme.secondaryContainer }]}>
          <Package size={24} color={theme.primary} />
        </View>
      )}

      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {product.productName}
        </Text>
        <Text style={[styles.sku, { color: theme.textSecondary }]}>{product.sku}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
          {product.categoryName ?? 'Chưa có nhóm'} · {product.unitName}
        </Text>
        {showStock && product.quantityOnHand !== null ? (
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            Tồn:{' '}
            <Text style={[styles.quantity, { color: theme.text }]}>
              {formatQuantity(product.quantityOnHand, 6)}
            </Text>{' '}
            {product.unitName}
          </Text>
        ) : null}
        {product.status === 'Inactive' ? (
          <StatusPill label={PRODUCT_STATUS_LABEL[product.status]} tone={PRODUCT_STATUS_TONE[product.status]} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderRadius: Radius.xl },
  pressed: { opacity: 0.85 },
  thumbnail: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: Radius.lg },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  name: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 21 },
  sku: { fontFamily: FontFamily.mono, fontSize: 12 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
  quantity: { fontFamily: FontFamily.mono },
});
