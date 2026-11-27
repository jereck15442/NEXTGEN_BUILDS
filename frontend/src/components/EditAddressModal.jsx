import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const REGIONS = [
  { value: 'NCR', label: 'National Capital Region' },
  { value: 'Region I', label: 'Region I (Ilocos)' },
  { value: 'Region II', label: 'Region II (Cagayan Valley)' },
  { value: 'Region III', label: 'Region III (Central Luzon)' },
  { value: 'Region IV-A', label: 'Region IV-A (CALABARZON)' },
  { value: 'Region IV-B', label: 'Region IV-B (MIMAROPA)' },
  { value: 'Region V', label: 'Region V (Bicol)' },
  { value: 'Region VI', label: 'Region VI (Western Visayas)' },
  { value: 'Region VII', label: 'Region VII (Central Visayas)' },
  { value: 'Region VIII', label: 'Region VIII (Eastern Visayas)' },
  { value: 'Region IX', label: 'Region IX (Zamboanga Peninsula)' },
  { value: 'Region X', label: 'Region X (Northern Mindanao)' },
  { value: 'Region XI', label: 'Region XI (Davao)' },
  { value: 'Region XII', label: 'Region XII (SOCCSKSARGEN)' },
  { value: 'CAR', label: 'Cordillera Administrative Region' },
  { value: 'ARMM', label: 'Bangsamoro (ARMM)' }
];

const PROVINCES_BY_REGION = {
  NCR: ['City of Manila', 'City of Mandaluyong', 'City of Marikina', 'City of Pasay', 'City of Quezon City'],
  'Region I': ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
  'Region II': ['Batanes', 'Cagayan', 'Isabela', 'Quirino', 'Nueva Vizcaya'],
  'Region III': ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'],
  'Region IV-A': ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'],
  'Region IV-B': ['Marinduque', 'Occidental Mindoro', 'Oriental Mindoro', 'Romblon', 'Palawan'],
  'Region V': ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
  'Region VI': ['Aklan', 'Antique', 'Capiz', 'Iloilo', 'Negros Occidental', 'Guimaras'],
  'Region VII': ['Bohol', 'Cebu', 'Negros Oriental', 'Siquijor'],
  'Region VIII': ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Southern Samar', 'Samar'],
  'Region IX': ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay', 'Zamboanga City'],
  'Region X': ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental', 'Cagayan de Oro'],
  'Region XI': ['Compostela Valley', 'Davao del Norte', 'Davao del Sur', 'Davao de Oro', 'Davao City'],
  'Region XII': ['Cotabato', 'Sultan Kudarat', 'South Cotabato', 'North Cotabato', 'Gensan'],
  CAR: ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province', 'Baguio City'],
  ARMM: ['Lanao del Sur', 'Maguindanao', 'Sulu', 'Tawi-Tawi', 'Bangsamoro']
};

const CITIES_BY_REGION = {
  NCR: ['City of Manila', 'City of Mandaluyong', 'City of Marikina', 'City of Pasay', 'City of Quezon City'],
  'Region I': ['San Carlos City', 'Urdaneta City', 'Tayabas City'],
  'Region II': ['Tuguegarao City', 'Santiago City'],
  'Region III': ['Cabanatuan City', 'Gapan City', 'San Jose City'],
  'Region IV-A': ['Lipa City', 'Santa Rosa City', 'Calamba City'],
  'Region IV-B': ['Puerto Princesa City'],
  'Region V': ['Legazpi City', 'Naga City', 'Masao'],
  'Region VI': ['Iloilo City', 'Roxas City', 'Cadiz City'],
  'Region VII': ['Cebu City', 'Mandaue City', 'Lapu-Lapu City'],
  'Region VIII': ['Tacloban City', 'Ormoc City'],
  'Region IX': ['Zamboanga City'],
  'Region X': ['Cagayan de Oro City'],
  'Region XI': ['Davao City'],
  'Region XII': ['General Santos City'],
  CAR: ['Baguio City'],
  ARMM: ['Cotabato City']
};

const BARANGAYS_BY_CITY = {
  Manila: ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'],
  'Quezon City': ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5', 'Barangay 6', 'Barangay 7'],
  Cebu: ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'],
  Davao: ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'],
  'Cagayan de Oro': ['Barangay 1', 'Barangay 2', 'Barangay 3'],
  Naga: ['Barangay 1', 'Barangay 2', 'Barangay 3'],
  Iloilo: ['Barangay 1', 'Barangay 2', 'Barangay 3'],
  Tacloban: ['Barangay 1', 'Barangay 2', 'Barangay 3']
};

const GENERIC_BARANGAYS = ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'];

const LABELS = [
  { value: 'home', text: 'Home' },
  { value: 'work', text: 'Work' },
  { value: 'other', text: 'Other' }
];

const formFromAddress = (address) => ({
  fullName: address?.fullName || '',
  phoneNumber: address?.phoneNumber || '',
  region: address?.region || '',
  province: address?.province || '',
  city: address?.city || '',
  barangay: address?.barangay || '',
  postalCode: address?.postalCode || '',
  streetName: address?.streetName || '',
  building: address?.building || '',
  houseNo: address?.houseNo || '',
  label: address?.label || 'other'
});

const citiesForRegion = (region) => CITIES_BY_REGION[region] || [];

const barangaysForCity = (city) => {
  const key = city.replace(/^City of\s*/i, '').trim();
  return BARANGAYS_BY_CITY[key] || GENERIC_BARANGAYS;
};

const validate = (form) => {
  const errors = {};

  if (!form.fullName.trim()) {
    errors.fullName = 'Enter the recipient name.';
  }
  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = 'Enter a phone number for delivery updates.';
  } else if (!/^\+?[0-9]{10,15}$/.test(form.phoneNumber.replace(/\s/g, ''))) {
    errors.phoneNumber = 'Use 10 to 15 digits, with an optional leading +.';
  }
  if (!form.postalCode.trim()) {
    errors.postalCode = 'Enter the postal code.';
  } else if (!/^\d{4}$|^\d{3}[-\s]?\d{3}$/.test(form.postalCode.trim())) {
    errors.postalCode = 'Use a 4-digit code, or the NNN NNN format.';
  }

  return errors;
};

export const EditAddressModal = ({ isOpen, onClose, onSave, address }) => {
  const [form, setForm] = useState(() => formFromAddress(address));
  const [provinces, setProvinces] = useState(PROVINCES_BY_REGION[address?.region] || []);
  const [cities, setCities] = useState(citiesForRegion(address?.region));
  const [barangays, setBarangays] = useState(address?.city ? barangaysForCity(address.city) : []);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useEffect(() => {
    setForm(formFromAddress(address));
    setErrors({});
    setSaveError('');
    setProvinces(PROVINCES_BY_REGION[address?.region] || []);
    setCities(citiesForRegion(address?.region));
    setBarangays(address?.city ? barangaysForCity(address.city) : []);
  }, [address]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstFieldRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
    if (errors[name]) {
      setErrors((previous) => ({ ...previous, [name]: undefined }));
    }
  };

  const handleRegionChange = (event) => {
    const region = event.target.value;
    setForm((previous) => ({ ...previous, region, province: '', city: '', barangay: '' }));
    setProvinces(PROVINCES_BY_REGION[region] || []);
    setCities([]);
    setBarangays([]);
  };

  const handleProvinceChange = (event) => {
    const province = event.target.value;
    setForm((previous) => ({ ...previous, province, city: '', barangay: '' }));
    setCities(citiesForRegion(form.region));
    setBarangays([]);
  };

  const handleCityChange = (event) => {
    const city = event.target.value;
    setForm((previous) => ({ ...previous, city, barangay: '' }));
    setBarangays(city ? barangaysForCity(city) : []);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`address-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      await onSave?.(form);
      onClose?.();
    } catch (err) {
      setSaveError(err?.message || 'Could not save the address. Check your details and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="address-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div ref={dialogRef} className="address-modal" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
        <div className="address-modal-header">
          <h2 id="address-modal-title" className="address-modal-title">
            {address ? 'Edit address' : 'Add address'}
          </h2>
          <button type="button" className="address-modal-close" onClick={onClose} aria-label="Close address form">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form id="address-form" className="address-modal-body" onSubmit={handleSubmit} noValidate>
          <h3 className="address-modal-section">Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="address-fullName" className="block text-sm font-medium text-text mb-2">Full name</label>
              <input
                id="address-fullName"
                ref={firstFieldRef}
                type="text"
                className="form-input"
                value={form.fullName}
                onChange={(event) => setField('fullName', event.target.value)}
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? 'address-fullName-error' : undefined}
              />
              {errors.fullName && <p id="address-fullName-error" className="form-error">{errors.fullName}</p>}
            </div>
            <div>
              <label htmlFor="address-phoneNumber" className="block text-sm font-medium text-text mb-2">Phone number</label>
              <input
                id="address-phoneNumber"
                type="tel"
                className="form-input"
                value={form.phoneNumber}
                onChange={(event) => setField('phoneNumber', event.target.value)}
                autoComplete="tel"
                aria-invalid={Boolean(errors.phoneNumber)}
                aria-describedby={errors.phoneNumber ? 'address-phoneNumber-error' : undefined}
              />
              {errors.phoneNumber && <p id="address-phoneNumber-error" className="form-error">{errors.phoneNumber}</p>}
            </div>
          </div>

          <h3 className="address-modal-section">Delivery location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="address-region" className="block text-sm font-medium text-text mb-2">Region</label>
              <select id="address-region" className="form-select" value={form.region} onChange={handleRegionChange}>
                <option value="">Select region</option>
                {REGIONS.map((region) => (
                  <option key={region.value} value={region.value}>{region.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="address-province" className="block text-sm font-medium text-text mb-2">Province</label>
              <select
                id="address-province"
                className="form-select"
                value={form.province}
                onChange={handleProvinceChange}
                disabled={provinces.length === 0}
              >
                <option value="">Select province</option>
                {provinces.map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="address-city" className="block text-sm font-medium text-text mb-2">City</label>
              <select
                id="address-city"
                className="form-select"
                value={form.city}
                onChange={handleCityChange}
                disabled={cities.length === 0}
              >
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="address-barangay" className="block text-sm font-medium text-text mb-2">Barangay</label>
              <select
                id="address-barangay"
                className="form-select"
                value={form.barangay}
                onChange={(event) => setField('barangay', event.target.value)}
                disabled={barangays.length === 0}
              >
                <option value="">Select barangay</option>
                {barangays.map((barangay) => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address-postalCode" className="block text-sm font-medium text-text mb-2">Postal code</label>
              <input
                id="address-postalCode"
                type="text"
                inputMode="numeric"
                className="form-input"
                value={form.postalCode}
                onChange={(event) => setField('postalCode', event.target.value)}
                autoComplete="postal-code"
                aria-invalid={Boolean(errors.postalCode)}
                aria-describedby={errors.postalCode ? 'address-postalCode-error' : undefined}
              />
              {errors.postalCode && <p id="address-postalCode-error" className="form-error">{errors.postalCode}</p>}
            </div>
          </div>

          <h3 className="address-modal-section">Street details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="address-streetName" className="block text-sm font-medium text-text mb-2">Street name</label>
              <input
                id="address-streetName"
                type="text"
                className="form-input"
                value={form.streetName}
                onChange={(event) => setField('streetName', event.target.value)}
                autoComplete="address-line1"
              />
            </div>
            <div>
              <label htmlFor="address-houseNo" className="block text-sm font-medium text-text mb-2">House no.</label>
              <input
                id="address-houseNo"
                type="text"
                className="form-input"
                value={form.houseNo}
                onChange={(event) => setField('houseNo', event.target.value)}
                placeholder="e.g. 23-A"
              />
            </div>
            <div>
              <label htmlFor="address-building" className="block text-sm font-medium text-text mb-2">Building or subdivision</label>
              <input
                id="address-building"
                type="text"
                className="form-input"
                value={form.building}
                onChange={(event) => setField('building', event.target.value)}
                autoComplete="address-line2"
              />
            </div>
          </div>

          <h3 className="address-modal-section">Save as</h3>
          <div className="address-label-options" role="radiogroup" aria-label="Address label">
            {LABELS.map(({ value, text }) => (
              <label
                key={value}
                className={`address-label-option${form.label === value ? ' selected' : ''}`}
              >
                <input
                  type="radio"
                  name="label"
                  value={value}
                  checked={form.label === value}
                  onChange={() => setField('label', value)}
                />
                <span>{text}</span>
              </label>
            ))}
          </div>
        </form>

        <div className="address-modal-footer">
          {saveError && <p className="address-save-error" role="alert">{saveError}</p>}
          <button type="button" className="btn btn-outline flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="address-form" className="btn btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Save address'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAddressModal;
