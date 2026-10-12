// Configuración centralizada de Historias Fantásticas (v2.0)
// Único lugar donde se modifican datos de contacto, enlaces y parámetros comerciales.

export const CONFIG = {
  brandName: 'Historias Fantásticas',
  tagline: 'Librería en San Miguel, El Salvador',
  logoUrl: 'assets/logo.svg',
  faviconUrl: 'assets/favicon.svg',

  // Datos fijos de contacto (Decisión del cliente)
  whatsapp: {
    number: '+503 7757 8592',
    raw: '50377578592',
    link: 'https://wa.me/50377578592'
  },
  schedule: 'Lunes a sábado, 8:00 a. m. a 8:00 p. m.',
  location: {
    address: 'Colonia Vista Hermosa',
    city: 'San Miguel',
    country: 'El Salvador'
  },

  // Mensajes base contextuales para WhatsApp
  whatsappMessages: {
    general: '¡Hola, Historias Fantásticas! Quisiera consultar sobre su catálogo de libros.',
    writerPublish: '¡Hola! Me gustaría recibir información sobre la publicación y apoyo a escritores emergentes en Historias Fantásticas.',
    orderTemplate: (order) => {
      const itemsList = order.items
        .map(it => `• ${it.title} (${it.format === 'ebook' ? 'Ebook' : 'Físico'}) x${it.qty} - $${(it.price * it.qty).toFixed(2)}`)
        .join('\n');
      const deliveryText = order.deliveryType === 'envio' 
        ? `Envío a domicilio:\nDirección: ${order.address}` 
        : 'Retiro en el local (Colonia Vista Hermosa, San Miguel)';
      
      return `¡Hola, Historias Fantásticas! Acabo de generar el pedido *${order.id}* desde el sitio web.\n\n` +
        `*Cliente:* ${order.customerName}\n` +
        `*Teléfono:* ${order.customerPhone}\n` +
        `*Entrega:* ${deliveryText}\n\n` +
        `*Detalle del pedido:*\n${itemsList}\n\n` +
        `*Total:* $${order.total.toFixed(2)}\n` +
        (order.notes ? `*Notas:* ${order.notes}\n\n` : '\n') +
        `Quedo a la espera para coordinar el pago y la entrega. ¡Muchas gracias!`;
    }
  },

  // Valores pendientes de confirmación con el cliente (Sección 7)
  pendingConfirmations: {
    // PENDIENTE: confirmar con el cliente P01: ¿incluir libros de texto escolares y útiles?
    includeTextbooks: false,

    // PENDIENTE: confirmar con el cliente P02: horario específico de atención por WhatsApp
    whatsappSupportHours: 'Lunes a sábado, 8:00 a. m. a 8:00 p. m.',

    // PENDIENTE: confirmar con el cliente P03: duración de las ofertas del día 15
    day15OfferDurationDays: 1,

    // PENDIENTE: confirmar con el cliente P04: zonas de envío detalladas, costos por zona y formas de pago aceptadas
    shippingZones: [
      { id: 'san-miguel-urbano', name: 'San Miguel (Zona Urbana)', cost: 0 /* PENDIENTE: confirmar costo */ },
      { id: 'oriente-interurbano', name: 'Resto de la zona oriental', cost: 0 /* PENDIENTE: confirmar costo */ }
    ],

    // PENDIENTE: confirmar con el cliente P05: método definitivo de entrega de ebooks (WhatsApp, correo o enlace seguro)
    ebookDeliveryMethod: 'whatsapp_o_correo',

    // PENDIENTE: confirmar con el cliente P06: dominio definitivo, hosting, base de datos y servidor de correo
    productionDomain: 'https://historiasfantasticas.example',

    // PENDIENTE: confirmar con el cliente P07: normativa legal de protección de datos personales y texto legal del aviso de privacidad
    privacyPolicyText: 'Historias Fantásticas trata sus datos personales únicamente para gestionar sus pedidos y consultas. No compartimos sus datos con terceros.',

    // PENDIENTE: confirmar con el cliente P08: alcance detallado del programa de apoyo editorial a escritores emergentes
    writerSupportScope: 'Revisión editorial, visibilidad en catálogo y coordinación de ventas físicas y digitales.',

    // PENDIENTE: confirmar con el cliente P09: validación de prioridades de la muestra
    samplePriority: 'v2.0-muestra'
  }
};
