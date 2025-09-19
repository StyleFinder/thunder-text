'use client'

import { useState } from 'react'
import {
  Navigation,
  TopBar,
  Frame,
} from '@shopify/polaris'
import {
  HomeIcon,
  SettingsIcon,
  PlusCircleIcon,
  QuestionCircleIcon,
} from '@shopify/polaris-icons'
import { useNavigation } from '../hooks/useNavigation'

interface AppNavigationProps {
  children: React.ReactNode
}

export function AppNavigation({ children }: AppNavigationProps) {
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false)
  const { buildUrl, navigateTo, isActive, getAuthParams } = useNavigation()
  
  const { hasAuth } = getAuthParams()

  const navigationItems = [
    {
      url: buildUrl('/dashboard'),
      label: 'Dashboard',
      icon: HomeIcon,
      onClick: () => navigateTo('/dashboard'),
      matches: isActive({ 
        label: 'Dashboard', 
        url: buildUrl('/dashboard'), 
        matchPaths: ['/dashboard'],
        exactMatch: false 
      }),
      exactMatch: false,
      matchPaths: ['/dashboard']
    },
    {
      url: buildUrl('/create'),
      label: 'Create Description',
      icon: PlusCircleIcon,
      onClick: () => navigateTo('/create'),
      matches: isActive({ 
        label: 'Create Description', 
        url: buildUrl('/create'), 
        matchPaths: ['/create', '/generate'],
        exactMatch: false 
      }),
      exactMatch: false,
      matchPaths: ['/create', '/generate']
    },
    {
      url: buildUrl('/settings'),
      label: 'Settings',
      icon: SettingsIcon,
      onClick: () => navigateTo('/settings'),
      matches: isActive({ 
        label: 'Settings', 
        url: buildUrl('/settings'), 
        matchPaths: ['/settings'],
        exactMatch: false 
      }),
      exactMatch: false,
      matchPaths: ['/settings']
    },
    {
      url: '#',
      label: 'Help',
      icon: QuestionCircleIcon,
      disabled: true,
      badge: 'Coming Soon'
    }
  ]

  const toggleMobileNavigationActive = () =>
    setMobileNavigationActive((mobileNavigationActive) => !mobileNavigationActive)

  const navigation = (
    <Navigation location={buildUrl('/dashboard')}>
      <Navigation.Section
        items={navigationItems}
        title="Thunder Text"
        action={{
          accessibilityLabel: 'Create new product description',
          icon: PlusCircleIcon,
          onClick: () => navigateTo('/create'),
        }}
      />
    </Navigation>
  )

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      userMenu={
        <TopBar.UserMenu
          actions={[
            {
              items: [
                { content: 'Settings', onAction: () => navigateTo('/settings') },
                { content: 'Help Center', disabled: true },
                { content: 'Documentation', disabled: true },
              ],
            },
          ]}
          name="Thunder Text"
          detail={hasAuth ? "Connected to Shopify" : "Not Connected"}
          initials="TT"
        />
      }
      onNavigationToggle={toggleMobileNavigationActive}
    />
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      <Frame
        topBar={topBarMarkup}
        navigation={navigation}
        showMobileNavigation={mobileNavigationActive}
        onNavigationDismiss={toggleMobileNavigationActive}
        skipToContentTarget="main-content"
      >
        <main id="main-content">
          {children}
        </main>
      </Frame>
    </div>
  )
}