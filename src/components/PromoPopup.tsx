import { useState, useEffect } from 'react'

export default function PromoPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [adminEnabled, setAdminEnabled] = useState(true)

  useEffect(() => {
    // 1. Check if admin turned it off
    fetch('/api/promo-status')
      .then(res => res.json())
      .then(data => {
        setAdminEnabled(data.enabled)
        if (!data.enabled) return

        // 2. Only show if admin says yes AND user hasn't closed it
        const popupClosed = localStorage.getItem('promoPopupClosed')
        if (!popupClosed) {
          setIsOpen(true)
        }
      })
      .catch(() => {
        // If API fails, show popup by default
        const popupClosed = localStorage.getItem('promoPopupClosed')
        if (!popupClosed) {
          setIsOpen(true)
        }
      })
  }, [])

  const closePopup = () => {
    setIsOpen(false)
    localStorage.setItem('promoPopupClosed', 'true')
  }

  // Don't render anything if admin disabled it
  if (!adminEnabled || !isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button 
          onClick={closePopup}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
        
        <h2 className="text-2xl font-bold mb-4 text-center">Special Offer!</h2>
        
        <img 
          src="/promo-image.jpg" 
          alt="Promotion" 
          className="w-full rounded mb-4"
        />
        
        <p className="text-gray-700 mb-4 text-center">
          Get 20% off your first order at Csagala Dinner. Limited time only!
        </p>
        
        <button 
          onClick={closePopup}
          className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
        >
          Order Now
        </button>
      </div>
    </div>
  )
}
