'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  CalculatorIcon, 
  DocumentTextIcon, 
  CreditCardIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  HomeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'Calculations', href: '/dashboard/calculations', icon: CalculatorIcon },
  { name: 'Documents', href: '/dashboard/documents', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
  { name: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="dashboard-nav">
      {/* Mobile navigation */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-blue-600">EquiSplit</span>
          </Link>
          
          {/* Mobile menu button would go here */}
        </div>
      </div>

      {/* Desktop sidebar */}
      <nav className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:bg-white lg:border-r lg:border-gray-200 lg:pt-5 lg:pb-4 lg:overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-blue-600">EquiSplit</span>
          </Link>
        </div>
        
        <div className="mt-6 flex-grow flex flex-col">
          <div className="px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    {
                      'bg-blue-100 text-blue-700': isActive,
                      'text-gray-600 hover:bg-gray-50 hover:text-gray-900': !isActive,
                    }
                  )}
                >
                  <Icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      {
                        'text-blue-500': isActive,
                        'text-gray-400 group-hover:text-gray-500': !isActive,
                      }
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
          
          {/* Call-to-action */}
          <div className="mt-8 px-3">
            <Link
              href="/calculator"
              className="group relative w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CalculatorIcon className="w-5 h-5 mr-2" />
              New Calculation
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}