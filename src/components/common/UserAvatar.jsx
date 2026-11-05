import React, { useState } from 'react';

export const UserAvatar = ({
  nombre = 'Usuario',
  avatarUrl = null,
  size = 'w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px]',
  textSize = 'text-xs',
  className = '',
}) => {
  const [errorCarga, setErrorCarga] = useState(false);
  const inicial = (nombre || 'U').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${size} rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm relative flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${className}`}
      style={{
        width: '36px',
        height: '36px',
        minWidth: '36px',
        minHeight: '36px',
        maxWidth: '36px',
        maxHeight: '36px',
        borderRadius: '9999px',
        overflow: 'hidden',
        flexShrink: 0,
        aspectRatio: '1 / 1',
      }}
    >
      {avatarUrl && !errorCarga ? (
        <img
          src={avatarUrl}
          alt={nombre ? `Foto de perfil de ${nombre}` : 'Foto de perfil'}
          className="w-full h-full object-cover object-center rounded-full block"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: '9999px',
            display: 'block',
          }}
          onError={() => setErrorCarga(true)}
        />
      ) : (
        <div
          className={`w-full h-full bg-emerald-500 text-white font-bold ${textSize} flex items-center justify-center select-none`}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#10b981',
            color: '#ffffff',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          {inicial}
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
