/**
 * ConfirmationDialog Component - Safety Controls
 * Prevents accidental data deletion with confirmation UI
 */

import React, { useState } from 'react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: {
    itemCount: number;
    dataType: string;
    permanent?: boolean;
  };
  actionLabel?: string;
  isDangerous?: boolean;
  requiresPassword?: boolean;
  onConfirm: (password?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Confirmation Dialog Component
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  details,
  actionLabel = 'Confirm',
  isDangerous = false,
  requiresPassword = false,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiresPassword && !password) {
      setPasswordError('Password is required');
      return;
    }

    setPasswordError(null);
    onConfirm(password);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError(null);
  };

  const bgColor = isDangerous ? 'bg-red-50' : 'bg-yellow-50';
  const borderColor = isDangerous ? 'border-red-300' : 'border-yellow-300';
  const buttonBgColor = isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
  const buttonColor = isDangerous ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 8px 0',
              color: isDangerous ? '#dc2626' : '#1f2937',
            }}
          >
            {isDangerous ? '⚠️ ' : '❓ '}
            {title}
          </h2>
        </div>

        {/* Message */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 12px 0', color: '#4b5563', lineHeight: '1.5' }}>
            {message}
          </p>

          {/* Details */}
          {details && (
            <div
              style={{
                backgroundColor: isDangerous ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${isDangerous ? '#fecaca' : '#fde68a'}`,
                borderRadius: '6px',
                padding: '12px',
                fontSize: '14px',
                marginTop: '12px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <strong>Items to delete:</strong> {details.itemCount}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Type:</strong> {details.dataType}
              </div>
              {details.permanent && (
                <div style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  ❌ This action is PERMANENT and cannot be undone
                </div>
              )}
              {!details.permanent && (
                <div style={{ color: '#16a34a', fontSize: '13px' }}>
                  ✅ You can restore these items for 30 days
                </div>
              )}
            </div>
          )}
        </div>

        {/* Password Input */}
        {requiresPassword && (
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              Admin Password Verification
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your admin password"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${passwordError ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordError && (
              <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                {passwordError}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={isLoading || (requiresPassword && !password)}
            style={{
              padding: '10px 20px',
              backgroundColor: isDangerous ? '#dc2626' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor:
                isLoading || (requiresPassword && !password)
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isLoading || (requiresPassword && !password) ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <>
                ⏳ {actionLabel}...
              </>
            ) : (
              <>
                {isDangerous ? '🚨 ' : '✅ '}
                {actionLabel}
              </>
            )}
          </button>
        </div>

        {/* Footer Info */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          ℹ️ This action will be logged for audit purposes.
        </div>
      </div>
    </div>
  );
};

/**
 * Data Deletion Preview Component
 */
export const DeletionPreview: React.FC<{
  items: Array<{ id: string; name: string; type: string }>;
  onClose: () => void;
}> = ({ items, onClose }) => {
  const groupedByType = items.reduce(
    (acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<string, typeof items>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: '0' }}>📋 Items to be deleted:</h3>

        {Object.entries(groupedByType).map(([type, typeItems]) => (
          <div key={type} style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#666', marginBottom: '8px' }}>
              {type} ({typeItems.length})
            </h4>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
              }}
            >
              {typeItems.map((item, idx) => (
                <li
                  key={item.id}
                  style={{
                    padding: '8px 12px',
                    borderBottom:
                      idx < typeItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                >
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginTop: '16px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

/**
 * Safe Action Button Component - Wraps dangerous operations
 */
export const SafeActionButton: React.FC<{
  label: string;
  onClick: () => void;
  isDangerous?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  itemCount?: number;
  dataType?: string;
}> = ({
  label,
  onClick,
  isDangerous = false,
  confirmTitle = 'Confirm Action',
  confirmMessage = 'Are you sure?',
  itemCount = 0,
  dataType = 'items',
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          padding: '8px 16px',
          backgroundColor: isDangerous ? '#ef4444' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '500',
        }}
      >
        {isDangerous ? '🗑️ ' : '✨ '}
        {label}
      </button>

      <ConfirmationDialog
        isOpen={showConfirm}
        title={confirmTitle}
        message={confirmMessage}
        details={{
          itemCount,
          dataType,
          permanent: isDangerous,
        }}
        isDangerous={isDangerous}
        actionLabel={label}
        onConfirm={() => {
          onClick();
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
