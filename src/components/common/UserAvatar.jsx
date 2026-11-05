import React, { useState } from 'react';

export const UserAvatar = ({
  nombre = 'Usuario',
  avatarUrl = null,
  size = 'w-9 h-9 min-w-[36px] min-h-[36px] aspect-square',
  textSize = 'text-xs',
  className = '',
}) => {
  const [errorCarga, setErrorCarga] = useState(false);
  const inicial = (nombre || 'U').trim().charAt(0).toUpperCase();

  // Si tiene URL y no ha fallado la carga, renderizar la imagen manteniendo relación de aspecto cuadrada y circular
  if (avatarUrl && !errorCarga) {
    return (
      <img
        src={avatarUrl}
        alt={`Avatar de ${nombre}`}
        className={`${size} rounded-full object-cover aspect-square border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 ${className}`}
        onError={() => setErrorCarga(true)}
      />
    );
  }

  // Fallback nativo: Círculo verde institucional con inicial blanca pura y proporción circular garantizada
  return (
    <div
      className={`${size} rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center ${textSize} shadow-sm shrink-0 select-none ${className}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      {inicial}
    </div>
  );
};

export default UserAvatar;
