'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { Alert, Segmented, Table, Tag, Typography } from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';
import { SummaryCards } from './SummaryCards';
import {
  formatAnalyzeFailureUser,
  type AnalyzeFailureItem,
  type AnalyzeFailureList,
} from './types';

export default function AdminAnalyzeFailuresPage() {
  const [page, setPage] = useState(1);
  const [inFlightFilter, setInFlightFilter] = useState<
    'all' | 'true' | 'false'
  >('all');

  const listQuery = useQuery({
    queryKey: ['admin', 'analyze-failures', page, inFlightFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });
      if (inFlightFilter !== 'all') {
        params.set('inFlight', inFlightFilter);
      }
      return adminApi<AnalyzeFailureList>(
        `analyze-failures?${params.toString()}`,
      );
    },
  });

  const data = listQuery.data;
  const errorCodes = useMemo(() => {
    const entries = Object.entries(data?.summary.byErrorCode ?? {});
    return entries.sort((a, b) => b[1] - a[1]);
  }, [data?.summary.byErrorCode]);

  const columns: ColumnsType<AnalyzeFailureItem> = [
    {
      title: 'Когда',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) => new Date(value).toLocaleString('ru-RU'),
    },
    {
      title: 'Пользователь',
      key: 'user',
      render: (_, row) => formatAnalyzeFailureUser(row.user, row.deviceId),
    },
    {
      title: 'Meal',
      dataIndex: 'mealId',
      ellipsis: true,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: 'Статус',
      dataIndex: 'inFlight',
      width: 140,
      render: (inFlight: boolean) =>
        inFlight ? (
          <Tag color="orange">In-flight (stale)</Tag>
        ) : (
          <Tag color="red">Terminal</Tag>
        ),
    },
    {
      title: 'Код',
      dataIndex: 'errorCode',
      width: 160,
      render: (value: string | null) => value ?? '—',
    },
  ];

  return (
    <>
      <PageHeader
        title="Сбои анализа"
        subtitle="Клиентские события «Анализ не завершился…» / Retry UI"
      />
      {listQuery.isError ? (
        <Alert
          showIcon
          type="error"
          message="Не удалось загрузить аналитику сбоев анализа"
        />
      ) : null}
      <SummaryCards
        loading={listQuery.isLoading}
        summary={data?.summary}
        summaryWindowDays={data?.summaryWindowDays ?? 30}
      />
      {errorCodes.length > 0 ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Коды:{' '}
          {errorCodes.map(([code, count]) => (
            <Tag key={code}>
              {code}: {count}
            </Tag>
          ))}
        </Typography.Paragraph>
      ) : null}
      <Segmented
        style={{ marginBottom: 16 }}
        value={inFlightFilter}
        onChange={(value) => {
          setPage(1);
          setInFlightFilter(value as 'all' | 'true' | 'false');
        }}
        options={[
          { label: 'Все', value: 'all' },
          { label: 'In-flight', value: 'true' },
          { label: 'Terminal', value: 'false' },
        ]}
      />
      <Table<AnalyzeFailureItem>
        rowKey="id"
        loading={listQuery.isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />
    </>
  );
}
