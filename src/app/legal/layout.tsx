import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Legal | EquiSplit',
    default: 'Legal | EquiSplit'
  },
  description: 'Legal information, privacy policy, and terms of service for EquiSplit - Community Property Calculator',
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}