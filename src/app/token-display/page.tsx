'use client'

import { useSearchParams } from 'next/navigation'
import { Page, Layout, Card, Text, Button, Banner, Stack } from '@shopify/polaris'
import { useState } from 'react'

export default function TokenDisplay() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const shop = searchParams.get('shop')
  const [copied, setCopied] = useState(false)
  
  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  return (
    <Page 
      title="Access Token Generated"
      subtitle={`For shop: ${shop}`}
    >
      <Layout>
        <Layout.Section>
          <Banner status="success">
            <p>Successfully obtained Shopify access token!</p>
          </Banner>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <Stack vertical spacing="loose">
              <Text variant="headingMd" as="h2">
                Your Shopify Access Token
              </Text>
              
              <Text as="p" color="subdued">
                Copy this token and update your .env.local file:
              </Text>
              
              <div style={{ 
                background: '#f6f6f7', 
                padding: '12px', 
                borderRadius: '8px', 
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                border: '1px solid #e1e3e5'
              }}>
                {token}
              </div>
              
              <Stack distribution="fillEvenly">
                <Button 
                  variant="primary" 
                  onClick={copyToken}
                  disabled={!token}
                >
                  {copied ? 'Copied!' : 'Copy Token'}
                </Button>
                
                <Button 
                  url="/create?shop=zunosai-staging-test-store.myshopify.com&authenticated=true"
                >
                  Continue to Create Product
                </Button>
              </Stack>
              
              <Card sectioned>
                <Text variant="headingMd" as="h3">
                  Next Steps:
                </Text>
                <Stack vertical spacing="tight">
                  <Text as="p">1. Copy the access token above</Text>
                  <Text as="p">2. Update your .env.local file:</Text>
                  <div style={{ 
                    background: '#f6f6f7', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>
                    SHOPIFY_ACCESS_TOKEN={token}
                  </div>
                  <Text as="p">3. Restart your development server</Text>
                  <Text as="p">4. Test product creation</Text>
                </Stack>
              </Card>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}