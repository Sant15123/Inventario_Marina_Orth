import React from 'react';

/**
 * Componente oficial para el icono de ROBÓTICA
 * Color contenedor corporativo: #0A3C63 (Azul Oscuro Robótica)
 * Trazo del icono: Blanco (#FFFFFF) según manual de marca.
 */
export const RoboticaIcon = ({ className = "w-6 h-6" }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Contenedor circular corporativo */}
        <circle cx="50" cy="50" r="48" fill="#0A3C63" />
        {/* Cara del robot con elemento de conexión y sonrisa (Manual FMO p.40) */}
        <path d="M30 42H70V70C70 75.5 65.5 80 60 80H40C34.5 80 30 75.5 30 70V42Z" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M40 30H60V42H40V30Z" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="42" cy="54" r="5" fill="white" />
        <circle cx="58" cy="54" r="5" fill="white" />
        <path d="M43 65C45 68 55 68 57 65" stroke="white" strokeWidth="4" strokeLinecap="round" />
        {/* Elemento de conexión superior (antena/nodo) */}
        <line x1="50" y1="30" x2="50" y2="18" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <circle cx="50" cy="15" r="4" fill="white" />
        <line x1="20" y1="55" x2="30" y2="55" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <line x1="70" y1="55" x2="80" y2="55" stroke="white" strokeWidth="5" strokeLinecap="round" />
    </svg>
);

/**
 * Componente oficial para el icono de NUEVAS TECNOLOGÍAS
 * Color contenedor corporativo: #2CACD0 (Azul Claro)
 * Trazo del icono: Blanco (#FFFFFF)
 */
export const NuevasTecnologiasIcon = ({ className = "w-6 h-6" }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#2CACD0" />
        {/* Laptop abierta con sonrisa en pantalla y nodos de conectividad (Manual FMO p.36) */}
        <path d="M22 62H78V66C78 68.2 76.2 70 74 70H26C23.8 70 22 68.2 22 66V62Z" fill="white" />
        <rect x="28" y="30" width="44" height="32" rx="4" stroke="white" strokeWidth="5" />
        {/* Sonrisa en la pantalla */}
        <path d="M42 48C44 51 56 51 58 48" stroke="#2CACD0" strokeWidth="4" strokeLinecap="round" />
        <circle cx="42" cy="42" r="3" fill="#2CACD0" />
        <circle cx="58" cy="42" r="3" fill="#2CACD0" />
        {/* Conectividad superior */}
        <path d="M36 20C40 16 60 16 64 20" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <path d="M42 25C45 23 55 23 58 25" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

/**
 * Componente oficial para el icono de TEACHLABS
 * Color contenedor corporativo: #7b2cbf (Morado TeachLabs)
 * Trazo del icono: Blanco (#FFFFFF)
 */
export const TeachLabsIcon = ({ className = "w-6 h-6" }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#7b2cbf" />
        {/* Contenedor de laboratorio con sonrisa, cohete, lápiz y regla (Manual FMO p.38) */}
        <path d="M32 42H68V75C68 77.8 65.8 80 63 80H37C34.2 80 32 77.8 32 75V42Z" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <path d="M42 42V32C42 30.9 42.9 30 44 30H56C57.1 30 58 30.9 58 32V42" stroke="white" strokeWidth="5" />
        {/* Sonrisa en el contenedor */}
        <path d="M42 58C45 63 55 63 58 58" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <circle cx="44" cy="50" r="3" fill="white" />
        <circle cx="56" cy="50" r="3" fill="white" />
        {/* Elementos pedagógicos flotantes superiores (Estrellas / Innovación) */}
        <circle cx="24" cy="30" r="3" fill="white" />
        <circle cx="76" cy="35" r="2" fill="white" />
        <path d="M72 20L75 25L80 22L75 27L78 32L73 29L70 34L71 28L66 26L71 24L72 20Z" fill="white" transform="scale(0.6) translate(60, -5)" />
    </svg>
);