'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  InputNumber,
  Space,
  Tag,
  Typography,
} from 'antd';

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
      <Typography.Title level={2}>Цены</Typography.Title>
      {pricingQuery.error ? (
        <Alert
          description={pricingQuery.error.message}
          message="Не удалось загрузить настройки"
          showIcon
          type="error"
        />
      ) : null}
      <Card loading={pricingQuery.isLoading} style={{ maxWidth: 560 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Text type="secondary">Источник настроек: </Typography.Text>
            <Tag color={pricingQuery.data?.source === 'db' ? 'green' : 'blue'}>
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
    </>
  );
}
