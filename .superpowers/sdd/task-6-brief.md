### Task 6: Promos section on pricing page

**Files:**
- Modify: `apps/ai-web/src/app/admin/pricing/page.tsx`

**Interfaces:**
- Consumes: `adminApi` paths `promos` (GET/POST) and `promos/${id}` (DELETE)
- Produces: UI card under pricing with create form + table + delete confirm

- [ ] **Step 1: Extend pricing page with promos UI**

Update `apps/ai-web/src/app/admin/pricing/page.tsx`:

1. Expand imports:

```ts
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
```

2. Add types after `PricingFormValues`:

```ts
type PromoItem = {
  id: string;
  code: string;
  discountPercent: number;
  createdAt: string;
};

type PromosResponse = { items: PromoItem[] };

type PromoFormValues = {
  code: string;
  discountPercent: number;
};
```

3. Inside `PricingPage`, after `savePricing` mutation, add:

```ts
  const [promoForm] = Form.useForm<PromoFormValues>();
  const promosQuery = useQuery({
    queryKey: ['admin', 'promos'],
    queryFn: () => adminApi<PromosResponse>('promos'),
  });
  const createPromo = useMutation({
    mutationFn: (values: PromoFormValues) =>
      adminApi<PromoItem>('promos', {
        body: JSON.stringify({
          code: values.code,
          discountPercent: values.discountPercent,
        }),
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'promos'] });
      promoForm.resetFields();
      message.success('РџСЂРѕРјРѕРєРѕРґ СЃРѕР·РґР°РЅ');
    },
    onError: (error) => message.error(error.message),
  });
  const deletePromo = useMutation({
    mutationFn: (id: string) =>
      adminApi<{ ok: true }>(`promos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'promos'] });
      message.success('РџСЂРѕРјРѕРєРѕРґ СѓРґР°Р»С‘РЅ');
    },
    onError: (error) => message.error(error.message),
  });
```

4. After the pricing `</Card>`, before the fragment close, add:

```tsx
      <Card
        loading={promosQuery.isLoading}
        style={{ maxWidth: 640, marginTop: 24 }}
        title="РџСЂРѕРјРѕРєРѕРґС‹"
      >
        {promosQuery.error ? (
          <Alert
            description={promosQuery.error.message}
            message="РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїСЂРѕРјРѕРєРѕРґС‹"
            showIcon
            style={{ marginBottom: 16 }}
            type="error"
          />
        ) : null}
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Form<PromoFormValues>
            form={promoForm}
            layout="vertical"
            onFinish={(values) => createPromo.mutate(values)}
            requiredMark={false}
          >
            <Form.Item
              label="РљРѕРґ"
              name="code"
              rules={[{ message: 'РЈРєР°Р¶РёС‚Рµ РєРѕРґ', required: true }]}
            >
              <Input placeholder="summer20" />
            </Form.Item>
            <Form.Item
              label="РЎРєРёРґРєР°, %"
              name="discountPercent"
              rules={[
                { message: 'РЈРєР°Р¶РёС‚Рµ СЃРєРёРґРєСѓ', required: true },
                {
                  message: 'РЎРєРёРґРєР° РѕС‚ 1 РґРѕ 99',
                  max: 99,
                  min: 1,
                  type: 'integer',
                },
              ]}
            >
              <InputNumber max={99} min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Button
              htmlType="submit"
              loading={createPromo.isPending}
              type="primary"
            >
              РЎРѕР·РґР°С‚СЊ
            </Button>
          </Form>
          <Table<PromoItem>
            columns={[
              { dataIndex: 'code', key: 'code', title: 'РљРѕРґ' },
              {
                dataIndex: 'discountPercent',
                key: 'discountPercent',
                render: (value: number) => `${value}%`,
                title: 'РЎРєРёРґРєР°',
                width: 100,
              },
              {
                key: 'actions',
                render: (_: unknown, record: PromoItem) => (
                  <Popconfirm
                    cancelText="РћС‚РјРµРЅР°"
                    okText="РЈРґР°Р»РёС‚СЊ"
                    onConfirm={() => deletePromo.mutate(record.id)}
                    title="РЈРґР°Р»РёС‚СЊ РїСЂРѕРјРѕРєРѕРґ?"
                  >
                    <Button danger loading={deletePromo.isPending} type="link">
                      РЈРґР°Р»РёС‚СЊ
                    </Button>
                  </Popconfirm>
                ),
                title: '',
                width: 120,
              },
            ]}
            dataSource={promosQuery.data?.items ?? []}
            locale={{ emptyText: 'РџСЂРѕРјРѕРєРѕРґРѕРІ РїРѕРєР° РЅРµС‚' }}
            pagination={false}
            rowKey="id"
            size="small"
          />
        </Space>
      </Card>
```

- [ ] **Step 2: Manual check (optional if servers running)**

1. Apply migration: `cd apps/ai-app && pnpm prisma:migrate` (or `prisma migrate deploy` against local DB).
2. Open `/admin/pricing`, create a code, validate on `/subscribe` in `ai-food`, delete code, confirm validate fails.

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/app/admin/pricing/page.tsx
git commit -m "feat(ai-web): manage promo codes on pricing page"
```

---

