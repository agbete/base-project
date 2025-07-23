export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            🚀 Multi-Tenant SaaS
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Application SaaS moderne avec architecture multi-tenant
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🔐 Authentification</h3>
              <p className="text-gray-600">JWT + 2FA avec QR codes</p>
            </div>
            
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🏢 Multi-Tenant</h3>
              <p className="text-gray-600">Isolation parfaite des données</p>
            </div>
            
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">👥 Permissions</h3>
              <p className="text-gray-600">Système granulaire service.table.action</p>
            </div>
            
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">📊 DataTables</h3>
              <p className="text-gray-600">Filtres avancés et export</p>
            </div>
            
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🏷️ Codes Auto</h3>
              <p className="text-gray-600">Générateur configurable</p>
            </div>
            
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">🌍 Multi-Langues</h3>
              <p className="text-gray-600">i18n avec localisation</p>
            </div>
          </div>
          
          <div className="mt-12">
            <a 
              href="/login" 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
            >
              Se connecter
            </a>
            <a 
              href="/api/health" 
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Health Check
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

