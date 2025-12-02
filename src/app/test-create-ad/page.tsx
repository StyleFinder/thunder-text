'use client'

/**
 * Test page for Create Facebook Ad flow
 *
 * Accessible at: /test-create-ad?shop=zunosai-staging-test-store.myshopify.com
 */

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import CreateAdModal from '@/components/facebook/CreateAdModal'

export default function TestCreateAdPage() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop') || 'zunosai-staging-test-store.myshopify.com'

  const [modalOpen, setModalOpen] = useState(false)

  // Sample product data
  const [title, setTitle] = useState('Women\'s Casual Summer Dress')
  const [copy, setCopy] = useState('Perfect for warm weather! Lightweight, breathable fabric with a flattering fit. Available in multiple colors.')
  const [images] = useState([
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-2_large.png'
  ])

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Create Facebook Ad</h1>
          <p className="text-gray-600 mt-2">Test the complete ad creation flow</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="copy">Description/Copy</Label>
                  <Textarea
                    id="copy"
                    value={copy}
                    onChange={(e) => setCopy(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Product Images:</p>
                  <p className="text-sm text-gray-600">
                    {images.length} images available
                  </p>
                </div>

                <Button
                  onClick={() => setModalOpen(true)}
                  size="lg"
                  className="w-full"
                >
                  Create Facebook Ad
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Test Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                  <li>Edit the title and copy if desired</li>
                  <li>Click "Create Facebook Ad"</li>
                  <li>Select ad account and campaign</li>
                  <li>Preview and edit the ad</li>
                  <li>Submit to Facebook</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CreateAdModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        shop={shop}
        shopifyProductId="test-product-123"
        initialTitle={title}
        initialCopy={copy}
        imageUrls={images}
      />
    </div>
  )
}
