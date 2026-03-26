import React, {useState, useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  UsersRound,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  UserPlus,
} from "lucide-react";
import {groupsService, membersService} from "@/services/api";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Modal para ver/gestionar miembros
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await groupsService.getAll();
      setGroups(data.groups || []);
    } catch (error) {
      console.error("Error al cargar grupos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentGroup(null);
    setFormData({name: "", description: ""});
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group) => {
    setIsEditing(true);
    setCurrentGroup(group);
    setFormData({
      name: group.name || "",
      description: group.description || "",
    });
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentGroup(null);
    setFormError("");
    setFormSuccess("");
  };

  const handleInputChange = (e) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
      };

      if (isEditing && currentGroup) {
        await groupsService.update(currentGroup.id, payload);
        setFormSuccess("Grupo actualizado exitosamente");
      } else {
        await groupsService.create(payload);
        setFormSuccess("Grupo creado exitosamente");
      }

      setTimeout(() => {
        handleCloseModal();
        fetchGroups();
      }, 1500);
    } catch (error) {
      setFormError(
        error.response?.data?.error ||
          "Error al guardar el grupo. Intenta de nuevo.",
      );
    }
  };

  const handleDelete = async (id, groupName) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el grupo "${groupName}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    try {
      await groupsService.delete(id);
      fetchGroups();
    } catch (error) {
      alert(
        error.response?.data?.error ||
          "Error al eliminar el grupo. Intenta de nuevo.",
      );
    }
  };

  const handleOpenMembersModal = async (group) => {
    setSelectedGroup(group);
    setIsMembersModalOpen(true);

    try {
      // Obtener detalles del grupo con sus miembros
      const groupDetails = await groupsService.getById(group.id);
      setGroupMembers(groupDetails.members || []);

      // Obtener todos los miembros disponibles
      const allMembers = await membersService.getAll({limit: 1000});
      setAvailableMembers(allMembers.members || []);
    } catch (error) {
      console.error("Error al cargar miembros:", error);
    }
  };

  const handleCloseMembersModal = () => {
    setIsMembersModalOpen(false);
    setSelectedGroup(null);
    setGroupMembers([]);
    setSelectedMember("");
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;

    try {
      await groupsService.addMember(selectedGroup.id, selectedMember);

      // Recargar miembros del grupo
      const groupDetails = await groupsService.getById(selectedGroup.id);
      setGroupMembers(groupDetails.members || []);
      setSelectedMember("");
      fetchGroups(); // Actualizar contador
    } catch (error) {
      alert(error.response?.data?.error || "Error al agregar miembro");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("¿Deseas remover este miembro del grupo?")) {
      return;
    }

    try {
      await groupsService.removeMember(selectedGroup.id, memberId);

      // Recargar miembros del grupo
      const groupDetails = await groupsService.getById(selectedGroup.id);
      setGroupMembers(groupDetails.members || []);
      fetchGroups(); // Actualizar contador
    } catch (error) {
      alert(error.response?.data?.error || "Error al remover miembro");
    }
  };

  const filteredGroups = groups.filter((group) => {
    const name = group.name.toLowerCase();
    const description = (group.description || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || description.includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Grupos</h1>
          <p className="text-gray-400 mt-2">
            Administra los grupos y ministerios
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Grupo
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Groups Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando grupos...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <UsersRound className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">No se encontraron grupos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-cyan-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <UsersRound className="h-5 w-5 mr-2 text-cyan-400" />
                    {group.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  <div className="flex items-center text-gray-300">
                    <Users className="h-4 w-4 mr-2 text-cyan-400" />
                    <span className="text-sm">
                      {group.member_count || 0} miembro(s)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => handleOpenMembersModal(group)}
                      variant="outline"
                      size="sm"
                      className="bg-cyan-600/10 border-cyan-600 text-cyan-400 hover:bg-cyan-600/20"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Miembros
                    </Button>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(group)}
                        className="p-2 text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id, group.name)}
                        className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onClose={handleCloseModal}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Grupo" : "Nuevo Grupo"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Actualiza la información del grupo"
                : "Crea un nuevo grupo o ministerio"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {formError && (
              <div className="bg-red-900/20 border border-red-800 text-red-300 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-900/20 border border-green-800 text-green-300 rounded-lg p-3 flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{formSuccess}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Nombre del Grupo *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ej: Jóvenes, Adoración, Niños"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                placeholder="Describe el propósito del grupo..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleCloseModal}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                disabled={!!formSuccess}
              >
                {isEditing ? "Actualizar" : "Crear"} Grupo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members Modal */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent onClose={handleCloseMembersModal} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Miembros de {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Gestiona los miembros de este grupo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Add Member Section */}
            <div className="bg-slate-700 p-4 rounded-lg space-y-3">
              <h3 className="text-sm font-medium text-white">
                Agregar Miembro
              </h3>
              <div className="flex gap-3">
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="flex-1 h-10 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                >
                  <option value="">Seleccionar miembro...</option>
                  {availableMembers
                    .filter((m) => !groupMembers.some((gm) => gm.id === m.id))
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                </select>
                <Button
                  onClick={handleAddMember}
                  disabled={!selectedMember}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white">
                Miembros ({groupMembers.length})
              </h3>
              {groupMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No hay miembros en este grupo
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {groupMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-slate-700 p-3 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        {member.phone && (
                          <p className="text-sm text-cyan-400">
                            {member.phone}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-red-400 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCloseMembersModal}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
