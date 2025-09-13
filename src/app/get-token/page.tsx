'use client'

import { Page, Layout, Card, Text, Button, Banner, LegacyStack } from '@shopify/polaris'
import { useState } from 'react'

export default function GetToken() {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  
  const generateToken = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shop: 'zunosai-staging-test-store.myshopify.com',
          scopes: 'write_products,read_products,write_product_images,read_metaobjects,write_metaobjects'
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setToken(data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token')
    } finally {
      setLoading(false)
    }
  }
  
  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token)
    }
  }
  
  return (
    <Page title="Generate Access Token">
      <Layout>
        <Layout.Section>
          <Card>
            <LegacyStack vertical spacing="loose">
              <Text variant="headingMd" as="h2">
                Generate Shopify Access Token
              </Text>
              <Text as="p" color="subdued">
                This will generate a fresh access token for your development store.
              </Text>
              <LegacyStack distribution="leading">
                <Button 
                  variant="primary" 
                  onClick={generateToken}
                  loading={loading}
                >
                  Generate Token
                </Button>
              </LegacyStack>
              {error && (
                <Banner status="critical">
                  <p>{error}</p>
                </Banner>
              )}
              {token && (
                <>
                  <Banner status="success">
                    <p>Access token generated successfully!</p>
                  </Banner>
                  
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
                  
                  <LegacyStack distribution="leading">
                    <Button onClick={copyToken}>
                      Copy Token
                    </Button>
                  </LegacyStack>
                  
                  <Card sectioned>
                    <Text variant="headingMd" as="h3">Next Steps:</Text>
                    <LegacyStack vertical spacing="tight">
                      <Text as="p">1. Copy the token above</Text>
                      <Text as="p">2. Update .env.local:</Text>
                      <div style={{ 
                        background: '#f6f6f7', 
                        padding: '8px', 
                        borderRadius: '4px', 
                        fontFamily: 'monospace',
                        fontSize: '12px'
                      }}>
                        SHOPIFY_ACCESS_TOKEN={token}
                      </div>
                      <Text as="p">3. Restart your dev server</Text>
                      <Text as="p">4. Test product creation</Text>
                    </LegacyStack>
                  </Card>
                </>
              )}
            </LegacyStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}