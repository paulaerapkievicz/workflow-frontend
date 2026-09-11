// src/lib/sidebarOrder.ts
//
// Aplica a ordem personalizada do menu (lista de hrefs salva pelo dono) sobre a lista
// de itens já filtrada por permissão/badge que o Sidebar monta. Itens novos que ainda
// não estão na ordem salva (feature lançada depois) aparecem no final, na ordem padrão.

export function applySidebarOrder<T extends { href: string }>(
  items: T[],
  order?: string[] | null
): T[] {
  if (!order || order.length === 0) return items;

  const remaining = new Map(items.map((item) => [item.href, item]));
  const ordered: T[] = [];
  for (const href of order) {
    const item = remaining.get(href);
    if (!item) continue;
    ordered.push(item);
    remaining.delete(href);
  }
  for (const item of items) {
    if (remaining.has(item.href)) ordered.push(item);
  }
  return ordered;
}
