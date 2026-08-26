/**
 * Nexus One POS — Batch Closing Worker v1.0
 * 
 * Web Worker para procesar cierres de caja en background.
 * Calcula totales, genera resúmenes y procesa lotes de ventas
 * sin bloquear el hilo principal del UI.
 */

self.onmessage = function(e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'process-batch': {
      const { sales, exchangeRate } = payload;
      
      // Agrupar ventas por método de pago
      const methodGroups = {};
      let totalUsd = 0;
      let totalBs = 0;
      let count = 0;
      let creditTotal = 0;
      let casheaTotal = 0;
      
      for (const sale of sales) {
        const method = sale.isCredit ? 'credito' : sale.paymentMethod || 'efectivo';
        if (!methodGroups[method]) {
          methodGroups[method] = { count: 0, totalUsd: 0, totalBs: 0 };
        }
        methodGroups[method].count++;
        methodGroups[method].totalUsd += sale.total || 0;
        methodGroups[method].totalBs += sale.totalBs || (sale.total * exchangeRate) || 0;
        
        totalUsd += sale.total || 0;
        totalBs += sale.totalBs || (sale.total * exchangeRate) || 0;
        count++;
        
        if (sale.isCredit) creditTotal += sale.total || 0;
        if (sale.isCashea) casheaTotal += sale.total || 0;
      }
      
      // Calcular neto (sin crédito ni cashea)
      const netUsd = totalUsd - creditTotal - casheaTotal;
      const netBs = totalBs - (creditTotal * exchangeRate) - (casheaTotal * exchangeRate);
      
      // Separar métodos USD vs Bs
      const usdMethods = ['efectivo-usd', 'zelle', 'usdt'];
      const bsMethods = ['efectivo', 'transferencia', 'pago-movil', 'punto-de-venta'];
      
      let totalUsdElectronic = 0;
      let totalBsElectronic = 0;
      
      for (const [method, data] of Object.entries(methodGroups)) {
        if (usdMethods.includes(method)) totalUsdElectronic += data.totalUsd;
        if (bsMethods.includes(method)) totalBsElectronic += data.totalBs;
      }
      
      self.postMessage({
        type: 'batch-result',
        result: {
          count,
          totalUsd: Math.round(totalUsd * 100) / 100,
          totalBs: Math.round(totalBs * 100) / 100,
          netUsd: Math.round(netUsd * 100) / 100,
          netBs: Math.round(netBs * 100) / 100,
          creditTotal: Math.round(creditTotal * 100) / 100,
          casheaTotal: Math.round(casheaTotal * 100) / 100,
          methodBreakdown: methodGroups,
          totalUsdElectronic: Math.round(totalUsdElectronic * 100) / 100,
          totalBsElectronic: Math.round(totalBsElectronic * 100) / 100,
        },
      });
      break;
    }
    
    case 'generate-receipt-data': {
      const { sales, storeName, storeRif, sellerName, exchangeRate } = payload;
      
      // Generar datos de recibo para lote de ventas
      const receiptItems = sales.map((sale, idx) => ({
        index: idx + 1,
        id: sale.id,
        time: new Date(sale.createdAt).toLocaleTimeString('es-VE'),
        customer: sale.customerName || 'Consumidor Final',
        total: sale.total,
        totalBs: sale.totalBs || (sale.total * exchangeRate),
        method: sale.isCredit ? 'Credito' : (sale.isCashea ? 'Cashea' : sale.paymentMethod),
        isCredit: !!sale.isCredit,
      }));
      
      self.postMessage({
        type: 'receipt-data-result',
        result: {
          storeName,
          storeRif,
          sellerName,
          date: new Date().toLocaleDateString('es-VE'),
          items: receiptItems,
        },
      });
      break;
    }
    
    case 'ping': {
      self.postMessage({ type: 'pong' });
      break;
    }
  }
};
