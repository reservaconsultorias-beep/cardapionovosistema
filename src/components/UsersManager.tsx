import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Check, UserPlus, Trash2, Key, UserCheck, Lock } from 'lucide-react';

export const PERMISSION_DEFINITIONS = [
  { key: 'ver_pedidos', label: 'Ver e Atualizar Pedidos', description: 'Acesso à aba de Pedidos e alteração de status' },
  { key: 'gerenciar_caixa', label: 'Gerenciar Caixa', description: 'Abertura, fecho e sangrias de caixa' },
  { key: 'gerenciar_produtos', label: 'Gerenciar Produtos', description: 'Adicionar, editar e pausar produtos do cardápio' },
  { key: 'gerenciar_categorias', label: 'Gerenciar Categorias', description: 'Criar e reorganizar categorias' },
  { key: 'ver_relatorios', label: 'Ver Relatórios', description: 'Acesso à aba Visão Geral e Relatórios de Vendas' },
  { key: 'ver_clientes', label: 'Ver Clientes', description: 'Acesso à lista de clientes e histórico' },
  { key: 'gerenciar_configuracoes', label: 'Gerenciar Configurações', description: 'Horários de funcionamento, impressão e lojas' },
  { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários & Permissões', description: 'Criar e definir permissões de funcionários' },
];

export default function UsersManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleTogglePermission = async (profileId: string, permKey: string, currentValue: boolean) => {
    setSavingId(profileId);
    try {
      const targetProfile = profiles.find(p => p.id === profileId);
      const currentPermissions = targetProfile?.permissions || {};
      const updatedPermissions = {
        ...currentPermissions,
        [permKey]: !currentValue
      };

      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, permissions: updatedPermissions } : p));
      setFeedback("Permissões atualizadas com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err: any) {
      console.error("Erro ao atualizar permissão:", err);
      alert("Erro ao atualizar permissão: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleChangeRole = async (profileId: string, newRoleValue: string) => {
    setSavingId(profileId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRoleValue })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRoleValue } : p));
      setFeedback("Função atualizada com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err: any) {
      alert("Erro ao atualizar função: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Shield className="text-[#ea1d2c]" size={22} />
            Gestão de Usuários & Permissões Granulares
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Defina o que cada funcionário pode visualizar e gerenciar no sistema.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-sm">
          {feedback}
        </div>
      )}

      {/* Profiles List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 font-medium">Carregando usuários...</div>
        ) : profiles.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-medium">Nenhum usuário cadastrado.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {profiles.map(profile => {
              const isOwner = profile.role === 'owner';
              const perms = profile.permissions || {};

              return (
                <div key={profile.id} className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-base">{profile.email || profile.id}</span>
                        {isOwner && (
                          <span className="px-2.5 py-0.5 bg-[#FFDE59] text-gray-900 font-black text-xs rounded-full border border-amber-300">
                            👑 OWNER (DONO)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-semibold mt-1">ID: {profile.id}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-600">Função:</span>
                      <select
                        value={profile.role || 'staff'}
                        onChange={(e) => handleChangeRole(profile.id, e.target.value)}
                        disabled={savingId === profile.id}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none cursor-pointer"
                      >
                        <option value="owner">Dono (Owner - Acesso Total)</option>
                        <option value="staff">Funcionário (Staff)</option>
                        <option value="caixa">Operador de Caixa</option>
                        <option value="cozinha">Cozinha / Produção</option>
                        <option value="entregador">Entregador</option>
                      </select>
                    </div>
                  </div>

                  {/* Permissões Checklist Grid */}
                  <div>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                      Permissões de Acesso {isOwner && '(Possui acesso total automático)'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PERMISSION_DEFINITIONS.map(perm => {
                        const hasPerm = isOwner || !!perms[perm.key];

                        return (
                          <label
                            key={perm.key}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${hasPerm ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950' : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                          >
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              disabled={isOwner || savingId === profile.id}
                              onChange={() => handleTogglePermission(profile.id, perm.key, !!perms[perm.key])}
                              className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                            />
                            <div>
                              <div className="font-bold text-xs leading-tight">{perm.label}</div>
                              <div className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">{perm.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
