'use client'

import { useState, Suspense } from 'react'
import {
  Navigation,
  TopBar,
  Frame,
  Spinner,
  Box,
} from '@shopify/polaris'
import {
  HomeIcon,
  SettingsIcon,
  PlusCircleIcon,
  QuestionCircleIcon,
  EditIcon,
  MarketingIcon,
} from '@shopify/polaris-icons'
import { useNavigation } from '../hooks/useNavigation'

interface AppNavigationProps {
  children: React.ReactNode
}

function NavigationContent({ children }: AppNavigationProps) {
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
      url: buildUrl('/enhance'),
      label: 'Enhance Product',
      icon: EditIcon,
      onClick: () => navigateTo('/enhance'),
      matches: isActive({
        label: 'Enhance Product',
        url: buildUrl('/enhance'),
        matchPaths: ['/enhance'],
        exactMatch: false
      }),
      exactMatch: false,
      matchPaths: ['/enhance']
    },
    {
      url: buildUrl('/facebook-ads'),
      label: 'Facebook Ads',
      icon: MarketingIcon,
      onClick: () => navigateTo('/facebook-ads'),
      matches: isActive({
        label: 'Facebook Ads',
        url: buildUrl('/facebook-ads'),
        matchPaths: ['/facebook-ads', '/test-campaigns'],
        exactMatch: false
      }),
      exactMatch: false,
      matchPaths: ['/facebook-ads', '/test-campaigns']
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
      url: buildUrl('/help'),
      label: 'Help',
      icon: QuestionCircleIcon,
      onClick: () => navigateTo('/help'),
      matches: isActive({
        label: 'Help',
        url: buildUrl('/help'),
        matchPaths: ['/help'],
        exactMatch: false
      }),
      exactMatch: false,
      matchPaths: ['/help']
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
                { content: 'Help Center', onAction: () => navigateTo('/help') },
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

function NavigationFallback() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Frame
        topBar={
          <TopBar
            showNavigationToggle
            userMenu={
              <TopBar.UserMenu
                actions={[
                  {
                    items: [
                      { content: 'Loading...', disabled: true },
                    ],
                  },
                ]}
                name="Thunder Text"
                detail="Loading..."
                initials="TT"
              />
            }
          />
        }
        navigation={
          <Navigation location="/">
            <Navigation.Section
              items={[]}
              title="Thunder Text"
            />
          </Navigation>
        }
        skipToContentTarget="main-content"
      >
        <main id="main-content">
          <Box padding="800" minHeight="400px">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <Spinner size="small" />
            </div>
          </Box>
        </main>
      </Frame>
    </div>
  )
}

export function AppNavigation({ children }: AppNavigationProps) {
  return (
    <Suspense fallback={<NavigationFallback />}>
      <NavigationContent>{children}</NavigationContent>
    </Suspense>
  )
}