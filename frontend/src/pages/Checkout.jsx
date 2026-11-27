import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Pencil, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { addressesAPI } from '../api/addresses.js';
import { apiClient } from '../api/client.js';
import { EditAddressModal } from '../components/EditAddressModal.jsx';

export function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, loading, cart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalAddress, setModalAddress] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    setAddressLoading(true);
    setAddressError(false);
    try {
      const data = await addressesAPI.list();
      const list = Array.isArray(data) ? data : data?.addresses || [];
      setAddresses(list);
      return list;
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
      setAddressError(true);
      return [];
    } finally {
      setAddressLoading(false);
    }
  };

  const handleChangeAddress = (addressId, list = addresses) => {
    setSelectedAddressId(addressId);
    setAddress(list.find((saved) => saved._id === addressId) || null);
  };

  const openAddAddress = () => {
    setModalAddress(null);
    setSelectedAddressId(null);
    setIsEditing(true);
  };

  const openEditAddress = () => {
    setModalAddress(address);
    setIsEditing(true);
  };

  useEffect(() => {
    if (addresses.length > 0 && !address) {
      const defaultAddress = addresses.find((saved) => saved.default) || addresses[0];
      handleChangeAddress(defaultAddress._id);
    }
  }, [addresses]);

  if (!user || loading || !items || items.length === 0) {
    return null;
  }

  const addressLines = address
    ? [address.houseNo, address.streetName, address.building, address.barangay, address.city, address.province, address.postalCode]
      .filter(Boolean)
      .join(', ')
    : '';

  return (
    <div className="page container">
      {/* Order Summary Section */}
      <div className="mt-6 p-6 bg-surface border border-border rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-primary">Order Summary</h2>
          <span className="text-sm font-medium text-text-muted">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Estimated subtotal</span>
            <span className="text-text font-medium">₱{subtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Shipping</span>
            <span className="text-text font-medium">Free over ₱500</span>
          </div>

          {items.some((item) => item.product?.category === 'subscription' || item.product?.isSubscription) && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Subscription fee</span>
              <span className="text-text font-medium">₱{Math.round(subtotal * 0.1).toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between text-sm border-t border-border pt-3 font-semibold">
            <span className="text-text">Estimated total</span>
            <span className="text-xl text-primary">₱{(subtotal * 1.1).toLocaleString()}</span>
          </div>

          <p className="text-xs text-text-muted">
            Final total may vary based on coupon discounts and shipping address.
          </p>
        </div>

        {/* Coupon Section */}
        {cart?.couponCode && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary">Coupon <strong>{cart.couponCode}</strong> applied</span>
              <span className="text-success">Save ₱{(subtotal * 0.1).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Proceed to Payment Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={async () => {
              if (!address) {
                alert('Please select or add a delivery address first');
                return;
              }
              setIsSaving(true);
              try {
                const response = await apiClient.post('/orders', { addressId: address._id });
                navigate(`/payment/success?orderId=${response.data.order?._id || ''}`);
              } catch (err) {
                alert(err?.message || 'Failed to create order');
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="btn btn-primary btn-lg w-full"
          >
            {isSaving ? 'Creating Order…' : 'Proceed to Payment'}
          </button>
        </div>
      </div>

      {/* Delivery Address Section */}
      <div className="mb-6 p-6 bg-surface border border-border rounded-lg shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-primary">Delivery address</h2>
          {addresses.length > 0 && !addressLoading && !addressError && (
            <button type="button" onClick={openAddAddress} className="btn btn-ghost btn-sm text-primary">
              Add new
            </button>
          )}
        </div>

        {addressLoading ? (
          <p className="text-sm text-text-muted">Loading your addresses…</p>
        ) : addressError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-text">Could not load your saved addresses.</p>
            <button type="button" onClick={fetchAddresses} className="btn btn-outline btn-sm">Try again</button>
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-text-muted">No delivery address saved yet.</p>
            <button type="button" onClick={openAddAddress} className="btn btn-outline btn-sm">Add an address</button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.length > 1 && (
              <div>
                <label htmlFor="delivery-address-select" className="block text-sm font-medium text-text mb-2">
                  Saved addresses
                </label>
                <select
                  id="delivery-address-select"
                  className="form-select"
                  value={selectedAddressId || ''}
                  onChange={(event) => handleChangeAddress(event.target.value)}
                >
                  {addresses.map((saved) => (
                    <option key={saved._id} value={saved._id}>
                      {`${saved.label || 'Address'} - ${saved.fullName}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {address && (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <MapPin size={20} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text break-words">{address.fullName}</p>
                      {address.label && <span className="address-tag">{address.label}</span>}
                    </div>
                    {address.phoneNumber && (
                      <p className="flex items-center gap-2 text-sm text-text-muted">
                        <Phone size={14} className="flex-shrink-0" aria-hidden="true" />
                        <span className="break-words">{address.phoneNumber}</span>
                      </p>
                    )}
                    <p className="text-sm text-text-muted break-words">{addressLines}</p>
                  </div>
                </div>

                {address.default && <p className="text-xs font-medium text-text-muted">Default address</p>}

                <button type="button" onClick={openEditAddress} className="btn btn-outline btn-sm w-full sm:w-auto">
                  <Pencil size={16} aria-hidden="true" />
                  Edit address
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <EditAddressModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={async (formData) => {
          if (selectedAddressId) {
            await addressesAPI.update(selectedAddressId, formData);
          } else {
            await addressesAPI.create({
              ...formData,
              user: user._id,
              default: false
            });
          }
          const updatedList = await fetchAddresses();
          const savedAddress = selectedAddressId
            ? updatedList.find((item) => item._id === selectedAddressId)
            : updatedList.find((item) => item.default) || updatedList[updatedList.length - 1];
          if (savedAddress) {
            handleChangeAddress(savedAddress._id, updatedList);
          }
        }}
        address={modalAddress}
      />
    </div>
  );
}

export default Checkout;
