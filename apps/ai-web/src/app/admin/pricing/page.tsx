'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type Pricing = {
  priceKopecks: number;
  durationDays: number;
  source: 'db' | 'env';
};

type PricingFormValues = {
  priceRubles: number;
  durationDays: number;
};

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

export default function PricingPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<PricingFormValues>();
  const pricingQuery = useQuery({
    queryKey: ['admin', 'pricing'],
    queryFn: () => adminApi<Pricing>('pricing'),
  });
  const savePricing = useMutation({
    mutationFn: (values: PricingFormValues) =>
      adminApi<Pricing>('pricing', {
        body: JSON.stringify({
          durationDays: values.durationDays,
          priceKopecks: Math.round(values.priceRubles * 100),
        }),
        method: 'PUT',
      }),
    onSuccess: (pricing) => {
      queryClient.setQueryData(['admin', 'pricing'], pricing);
      message.success('Настройки цены сохранены');
    },
    onError: (error) => message.error(error.message),
  });
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
      message.success('Промокод создан');
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
      message.success('Промокод удалён');
    },
    onError: (error) => message.error(error.message),
  });

  useEffect(() => {
    if (pricingQuery.data) {
      form.setFieldsValue({
        durationDays: pricingQuery.data.durationDays,
        priceRubles: pricingQuery.data.priceKopecks / 100,
      });
    }
  }, [form, pricingQuery.data]);

  return (
    <>
      <PageHeader
        subtitle="Цена и срок подписки для оплаты"
        title="Цены"
      />
      {pricingQuery.error ? (
        <Alert
          description={pricingQuery.error.message}
          message="Не удалось загрузить настройки"
          showIcon
          type="error"
        />
      ) : null}
      <Card loading={pricingQuery.isLoading} style={{ maxWidth: 640 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Text type="secondary">Источник настроек: </Typography.Text>
            <Tag color={pricingQuery.data?.source === 'db' ? 'success' : 'processing'}>
              {pricingQuery.data?.source === 'db'
                ? 'База данных'
                : 'Переменные окружения'}
            </Tag>
          </div>
          <Form<PricingFormValues>
            form={form}
            layout="vertical"
            onFinish={(values) => savePricing.mutate(values)}
            requiredMark={false}
          >
            <Form.Item
              label="Цена подписки, ₽"
              name="priceRubles"
              rules={[
                { message: 'Укажите цену', required: true },
                {
                  message: 'Цена должна быть больше нуля',
                  min: 0.01,
                  type: 'number',
                },
              ]}
            >
              <InputNumber
                min={0.01}
                precision={2}
                step={100}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              label="Срок подписки, дней"
              name="durationDays"
              rules={[
                { message: 'Укажите срок', required: true },
                {
                  message: 'Срок должен быть целым положительным числом',
                  min: 1,
                  type: 'integer',
                },
              ]}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Button
              htmlType="submit"
              loading={savePricing.isPending}
              type="primary"
            >
              Сохранить
            </Button>
          </Form>
        </Space>
      </Card>
      <Card
        loading={promosQuery.isLoading}
        style={{ maxWidth: 640, marginTop: 24 }}
        title="Промокоды"
      >
        {promosQuery.error ? (
          <Alert
            description={promosQuery.error.message}
            message="Не удалось загрузить промокоды"
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
              label="Код"
              name="code"
              rules={[{ message: 'Укажите код', required: true }]}
            >
              <Input placeholder="summer20" />
            </Form.Item>
            <Form.Item
              label="Скидка, %"
              name="discountPercent"
              rules={[
                { message: 'Укажите скидку', required: true },
                {
                  message: 'Скидка от 1 до 99',
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
              Создать
            </Button>
          </Form>
          <Table<PromoItem>
            columns={[
              { dataIndex: 'code', key: 'code', title: 'Код' },
              {
                dataIndex: 'discountPercent',
                key: 'discountPercent',
                render: (value: number) => `${value}%`,
                title: 'Скидка',
                width: 100,
              },
              {
                key: 'actions',
                render: (_: unknown, record: PromoItem) => (
                  <Popconfirm
                    cancelText="Отмена"
                    okText="Удалить"
                    onConfirm={() => deletePromo.mutate(record.id)}
                    title="Удалить промокод?"
                  >
                    <Button danger loading={deletePromo.isPending} type="link">
                      Удалить
                    </Button>
                  </Popconfirm>
                ),
                title: '',
                width: 120,
              },
            ]}
            dataSource={promosQuery.data?.items ?? []}
            locale={{ emptyText: 'Промокодов пока нет' }}
            pagination={false}
            rowKey="id"
            size="small"
          />
        </Space>
      </Card>
    </>
  );
}
