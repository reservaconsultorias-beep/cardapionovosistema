import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save } from 'lucide-react';

interface SettingsManagerProps {
  onTestPrint?: (order: any) => void;
  autoPrint?: boolean;
  onToggleAutoPrint?: () => void;
  onExportCSV?: () => void;
  onChangePassword?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onTestSound?: () => void;
}

export default function SettingsManager({ 
  onTestPrint, 
  autoPrint, 
  onToggleAutoPrint, 
  onExportCSV, 
  onChangePassword,
  soundEnabled = true,
  onToggleSound,
  onTestSound
}: SettingsManagerProps) {
  const [feedback, setFeedback] = useState("");
  const [promoConfig, setPromoConfig] = useState({
    active: false,
    image_url: '',
    title: '🎉 Bem-vindo(a) ao 41 Menu\'s!',
    message: 'Agradecemos a sua visita e é com grande alegria que o(a) recebemos.\nSou a Giovanna e estou pronta para o(a) atender. 😊\nEnvie-nos uma mensagem pelo WhatsApp e teremos todo o gosto em ajudá-lo(a)!',
    button_text: 'Falar no WhatsApp'
  });

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase.from('menu_items').select('*').eq('id', 'system_config_promo').single();
      if (data && data.ingredients) {
        try {
          const parsed = JSON.parse(data.ingredients);
          setPromoConfig(parsed);
        } catch (e) { console.error("Error parsing config", e); }
      }
    }
    loadSettings();
  }, []);


  const [uploadingImage, setUploadingImage] = useState(false);

  const [adminLogoUrl, setAdminLogoUrl] = useState('');
  const [uploadingAdminLogo, setUploadingAdminLogo] = useState(false);

  useEffect(() => {
    async function loadAdminLogo() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'admin_logo_url').maybeSingle();
      if (data?.value) setAdminLogoUrl(data.value);
    }
    loadAdminLogo();
  }, []);

  const handleAdminLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAdminLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `admin-logo-${Date.now()}.${fileExt}`;
      const filePath = `admin/logo/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('Cardapio41menus').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('Cardapio41menus').getPublicUrl(filePath);
      const newUrl = data.publicUrl;
      setAdminLogoUrl(newUrl);
      await supabase.from('settings').upsert({ key: 'admin_logo_url', value: newUrl, updated_at: new Date().toISOString() });
    } catch (error: any) {
      console.error(error);
    } finally {
      setUploadingAdminLogo(false);
    }
  };

  const handleRemoveAdminLogo = async () => {
    setAdminLogoUrl('');
    await supabase.from('settings').upsert({ key: 'admin_logo_url', value: '', updated_at: new Date().toISOString() });
  };

  const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const [hours, setHours] = useState<any[]>([]);
  const [hoursFeedback, setHoursFeedback] = useState("");

  useEffect(() => {
    async function loadHours() {
      const { data } = await supabase.from('business_hours').select('*').order('day_of_week');
      if (data) setHours(data);
    }
    loadHours();
  }, []);

  const updateDay = (dayOfWeek: number, field: string, value: any) => {
    setHours(prev => prev.map(h => h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h));
  };

  const handleSaveHours = async () => {
    setHoursFeedback("Salvando...");
    const { error } = await supabase.from('business_hours').upsert(hours, { onConflict: 'day_of_week' });
    if (error) setHoursFeedback("Erro: " + error.message);
    else setHoursFeedback("Horários salvos com sucesso!");
    setTimeout(() => setHoursFeedback(""), 3000);
  };



  const [printDelay, setPrintDelay] = useState('200');
  const [printFeedback, setPrintFeedback] = useState('');

  useEffect(() => {
    async function loadPrintDelay() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'print_delay_ms').maybeSingle();
      if (data?.value) setPrintDelay(String(data.value));
    }
    loadPrintDelay();
  }, []);

  const handleSavePrintDelay = async () => {
    await supabase.from('settings').upsert({ key: 'print_delay_ms', value: printDelay, updated_at: new Date().toISOString() });
    setPrintFeedback('Configuração de impressão salva!');
    setTimeout(() => setPrintFeedback(''), 3000);
  };

  const handleTestPrint = () => {
    if (onTestPrint) {
      onTestPrint({
        id: 'TESTE',
        customerName: 'Cliente de Teste',
        orderType: 'Delivery',
        paymentMethod: 'Numerário',
        totalAmount: 20.90,
        createdAt: new Date().toISOString(),
        items: [
          { name: '1 - Margherita (Gr)', quantity: 1, priceCalculated: 18.90, basePrice: 18.90, extras: [] },
          { name: 'Coca Cola (Lata)', quantity: 1, priceCalculated: 2.00, basePrice: 2.00, extras: [] }
        ]
      });
    }
  };

  const [deliveryTime, setDeliveryTime] = useState('40 a 50 min');
  const [pickupTime, setPickupTime] = useState('25 a 35 min');
  const [timesFeedback, setTimesFeedback] = useState('');

  useEffect(() => {
    async function loadTimes() {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['delivery_time_estimate', 'pickup_time_estimate']);
      data?.forEach((row: any) => {
        if (row.key === 'delivery_time_estimate') setDeliveryTime(row.value);
        if (row.key === 'pickup_time_estimate') setPickupTime(row.value);
      });
    }
    loadTimes();
  }, []);

  const handleSaveTimes = async () => {
    await supabase.from('settings').upsert([
      { key: 'delivery_time_estimate', value: deliveryTime, updated_at: new Date().toISOString() },
      { key: 'pickup_time_estimate', value: pickupTime, updated_at: new Date().toISOString() },
    ]);
    setTimesFeedback('Tempos salvos com sucesso!');
    setTimeout(() => setTimesFeedback(''), 3000);
  };

  const [companyInfo, setCompanyInfo] = useState({ name: "41 Menu's", nif: '', address: '' });
  const [companyFeedback, setCompanyFeedback] = useState('');

  useEffect(() => {
    async function loadCompany() {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['company_name', 'company_nif', 'company_address']);
      const info = { name: "41 Menu's", nif: '', address: '' };
      data?.forEach((row: any) => {
        if (row.key === 'company_name') info.name = row.value;
        if (row.key === 'company_nif') info.nif = row.value;
        if (row.key === 'company_address') info.address = row.value;
      });
      setCompanyInfo(info);
    }
    loadCompany();
  }, []);

  const handleSaveCompany = async () => {
    await supabase.from('settings').upsert([
      { key: 'company_name', value: companyInfo.name, updated_at: new Date().toISOString() },
      { key: 'company_nif', value: companyInfo.nif, updated_at: new Date().toISOString() },
      { key: 'company_address', value: companyInfo.address, updated_at: new Date().toISOString() },
    ]);
    setCompanyFeedback('Dados salvos com sucesso!');
    setTimeout(() => setCompanyFeedback(''), 3000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setFeedback("Fazendo upload da imagem...");
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `41menus/promocoes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('Cardapio41menus')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('Cardapio41menus')
        .getPublicUrl(filePath);

      setPromoConfig({ ...promoConfig, image_url: data.publicUrl });
      setFeedback("Upload de imagem concluído com sucesso!");
    } catch (error: any) {
      console.error(error);
      setFeedback("Erro no upload (certifique-se de que criou um bucket 'Cardapio41menus' público no Supabase): " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("Salvando...");
    
    const dbItem = {
      id: 'system_config_promo',
      name: 'Configurações de Promoção',
      category: 'system_config', // Hidden category
      ingredients: JSON.stringify(promoConfig),
    };

    // Make sure category exists just in case
    await supabase.from('categories').upsert({ id: 'system_config', name: 'Configurações do Sistema', order_index: 99 }, { onConflict: 'id' });
    const { error } = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    
    if (error) setFeedback("Erro: " + error.message);
    else setFeedback("Salvo com sucesso!");
    setTimeout(() => setFeedback(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Avisos e Promoções (Pop-up Inicial)</h2>
          <p className="text-sm text-gray-500">Configure o banner que aparece quando o cliente acessa o cardápio.</p>
        </div>

        {feedback && <div className="mb-6 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{feedback}</div>}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <input 
              type="checkbox" 
              id="promo-active"
              checked={promoConfig.active}
              onChange={e => setPromoConfig({...promoConfig, active: e.target.checked})}
              className="w-5 h-5 text-[#ea1d2c] rounded border-gray-300 focus:ring-[#ea1d2c]"
            />
            <label htmlFor="promo-active" className="font-medium text-gray-900 cursor-pointer">
              Ativar Pop-up de Promoção/Aviso
            </label>
          </div>

          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Imagem do Pop-up</label>
            
            <div className="flex gap-3 items-center">
              <input 
                type="text" 
                value={promoConfig.image_url} 
                onChange={e => setPromoConfig({...promoConfig, image_url: e.target.value})}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                placeholder="URL da imagem ou faça o upload abaixo"
              />
            </div>
            {promoConfig.image_url && (
              <img src={promoConfig.image_url.startsWith('http') ? promoConfig.image_url : (promoConfig.image_url.startsWith('/') ? promoConfig.image_url : '/' + promoConfig.image_url)} alt="preview" className="h-32 rounded-lg object-cover mt-2 border border-gray-200" />
            )}

            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ou faça upload do seu computador (Recomendado)</label>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[#ea1d2c]/10 file:text-[#ea1d2c]
                  hover:file:bg-[#ea1d2c]/20
                  cursor-pointer border border-gray-200 rounded-lg p-1 bg-white"
              />
              <p className="text-xs text-gray-500 mt-2">Formatos aceitos: JPG, PNG, WEBP. A imagem será salva no bucket "images" do seu Supabase.</p>
            </div>
          </div>


          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Título</label>
            <input 
              type="text" 
              value={promoConfig.title} 
              onChange={e => setPromoConfig({...promoConfig, title: e.target.value})}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mensagem (Texto do aviso)</label>
            <textarea 
              rows={4}
              value={promoConfig.message} 
              onChange={e => setPromoConfig({...promoConfig, message: e.target.value})}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Texto do Botão (Deixe vazio para esconder o botão do WhatsApp)</label>
            <input 
              type="text" 
              value={promoConfig.button_text} 
              onChange={e => setPromoConfig({...promoConfig, button_text: e.target.value})}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="px-6 py-3 bg-[#ea1d2c] text-white rounded-xl font-medium hover:bg-[#c91825] transition-colors flex items-center gap-2">
              <Save size={18} /> Salvar Configurações
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Horário de Funcionamento</h2>
          <p className="text-sm text-gray-500">Defina o horário de cada dia da semana. O site bloqueia pedidos automaticamente fora desses horários.</p>
        </div>

        {hoursFeedback && <div className="mb-6 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{hoursFeedback}</div>}

        <div className="space-y-3">
          {hours.map((h) => (
            <div key={h.day_of_week} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="w-32 font-semibold text-sm text-gray-800">{DAY_NAMES[h.day_of_week]}</div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={h.is_closed}
                  onChange={(e) => updateDay(h.day_of_week, 'is_closed', e.target.checked)}
                  className="w-4 h-4 accent-[#ea1d2c] rounded"
                />
                Fechado o dia todo
              </label>
              {!h.is_closed && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={h.opens_at ? h.opens_at.slice(0,5) : ''}
                    onChange={(e) => updateDay(h.day_of_week, 'opens_at', e.target.value)}
                    className="p-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                  <span className="text-gray-400 text-sm">até</span>
                  <input
                    type="time"
                    value={h.closes_at ? h.closes_at.slice(0,5) : ''}
                    onChange={(e) => updateDay(h.day_of_week, 'closes_at', e.target.value)}
                    className="p-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-6">
          <button onClick={handleSaveHours} className="px-6 py-3 bg-[#ea1d2c] text-white rounded-xl font-medium hover:bg-[#c91825] transition-colors flex items-center gap-2">
            <Save size={18} /> Salvar Horários
          </button>
        </div>
      </div>



      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Impressão & Impressora</h2>
          <p className="text-sm text-gray-500">Ajuste o comportamento da impressora térmica e o tempo de atraso dos comprovantes.</p>
        </div>

        {onToggleAutoPrint && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              id="settings-autoprint"
              checked={!!autoPrint}
              onChange={onToggleAutoPrint}
              className="w-5 h-5 accent-[#8b0000] rounded cursor-pointer"
            />
            <label htmlFor="settings-autoprint" className="text-sm font-bold text-gray-800 cursor-pointer">
              Auto-Imprimir novos pedidos automaticamente
            </label>
          </div>
        )}

        {printFeedback && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{printFeedback}</div>}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Atraso antes de imprimir (ms)</label>
            <input
              type="number"
              value={printDelay}
              onChange={e => setPrintDelay(e.target.value)}
              className="w-28 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <button onClick={handleSaveHours} className="hidden" />
          <button onClick={handleSavePrintDelay} className="px-4 py-2.5 bg-[#ea1d2c] text-white rounded-lg text-sm font-medium hover:bg-[#c91825] transition-colors">
            Salvar
          </button>
          <button onClick={handleTestPrint} className="px-4 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
            🖨️ Testar Impressão
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Tempos de Entrega e Retirada</h2>
          <p className="text-sm text-gray-500">Texto mostrado no carrinho e na mensagem enviada ao WhatsApp.</p>
        </div>
        {timesFeedback && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{timesFeedback}</div>}
        <div className="space-y-3 max-w-md">
          <div>
            <label className="text-sm font-medium text-gray-700">Tempo estimado de entrega</label>
            <input type="text" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Tempo estimado de retirada</label>
            <input type="text" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
          </div>
          <button onClick={handleSaveTimes} className="px-6 py-3 bg-[#ea1d2c] text-white rounded-xl font-medium hover:bg-[#c91825] transition-colors flex items-center gap-2">
            <Save size={18} /> Salvar Tempos
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Dados da Empresa</h2>
          <p className="text-sm text-gray-500">Aparecem no cabeçalho da comanda impressa. Não substitui uma fatura fiscal oficial.</p>
        </div>
        {companyFeedback && <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{companyFeedback}</div>}
        <div className="space-y-3 max-w-md">
          <div>
            <label className="text-sm font-medium text-gray-700">Nome do Restaurante</label>
            <input type="text" value={companyInfo.name} onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">NIF</label>
            <input type="text" value={companyInfo.nif} onChange={e => setCompanyInfo({...companyInfo, nif: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Morada</label>
            <input type="text" value={companyInfo.address} onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
          </div>
          <button onClick={handleSaveCompany} className="px-6 py-3 bg-[#ea1d2c] text-white rounded-xl font-medium hover:bg-[#c91825] transition-colors flex items-center gap-2">
            <Save size={18} /> Salvar Dados
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Exportar Relatórios (CSV)</h2>
          <p className="text-sm text-gray-500">Exporte o relatório completo de vendas e pedidos em formato de planilha Excel / CSV.</p>
        </div>
        <button 
          onClick={onExportCSV} 
          className="px-5 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white text-sm font-bold rounded-xl transition-colors inline-flex items-center gap-2"
        >
          Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Alerta Sonoro de Pedidos</h2>
          <p className="text-sm text-gray-500">Tocar um sinal sonoro automático sempre que um novo pedido chegar via cardápio digital.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleSound}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${soundEnabled ? 'bg-emerald-600' : 'bg-gray-300'}`}
              role="switch"
              aria-checked={soundEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundEnabled ? 'translate-x-7' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-sm font-bold text-gray-900">
              {soundEnabled ? '🔔 Som Ativado (Liga)' : '🔕 Som Desativado (Desliga)'}
            </span>
          </div>

          {onTestSound && (
            <button
              type="button"
              onClick={onTestSound}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl transition-colors inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              🔊 Testar Som
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Segurança & Senha</h2>
          <p className="text-sm text-gray-500">Altere a sua senha de acesso ao painel de administração.</p>
        </div>
        <button 
          onClick={onChangePassword} 
          className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold rounded-xl transition-colors inline-flex items-center gap-2"
        >
          Alterar Senha
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Logo do Painel</h2>
          <p className="text-sm text-gray-500">Aparece no canto superior direito do painel administrativo (não afeta o site público dos clientes).</p>
        </div>
        <div className="space-y-3">
          {adminLogoUrl && (
            <div className="flex items-center gap-3">
              <img src={adminLogoUrl} alt="preview da logo do painel" className="h-12 rounded-lg object-contain border border-gray-200 bg-gray-50 p-2" />
              <button onClick={handleRemoveAdminLogo} className="text-sm font-semibold text-red-600 hover:underline">
                Remover logo
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            onChange={handleAdminLogoUpload}
            disabled={uploadingAdminLogo}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-[#C81E3A]/10 file:text-[#C81E3A]
              hover:file:bg-[#C81E3A]/20
              cursor-pointer border border-gray-200 rounded-lg p-1 bg-white"
          />
          {uploadingAdminLogo && <p className="text-sm text-gray-500">Enviando...</p>}
        </div>
      </div>
    </div>
  );
}
