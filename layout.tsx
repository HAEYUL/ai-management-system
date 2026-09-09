import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '해율 AI 경영실',
  description: '해율푸드의 문제를 진단하고 실행과 결과까지 관리하는 오너 전용 경영 공간',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
