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
  UserPlus,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  Printer,
} from "lucide-react";
import {familiesService, membersService, settingsService} from "@/services/api";
import {buildFamilyMembersPDF} from "@/utils/reportPrint";

export default function FamiliesPage() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFamily, setCurrentFamily] = useState(null);
  const [formData, setFormData] = useState({
    familyName: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Modal para ver/gestionar miembros
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [relationship, setRelationship] = useState("MIEMBRO");

  // Diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [errorAlert, setErrorAlert] = useState("");
  const [church, setChurch] = useState({});

  useEffect(() => {
    settingsService
      .getChurch()
      .then((r) => setChurch(r.church || r || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchFamilies();
  }, [pagination.page]);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const data = await familiesService.getAll({
        page: pagination.page,
        limit: pagination.limit,
      });
      setFamilies(data.families || []);
      if (data.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Error al cargar familias:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentFamily(null);
    setFormData({familyName: ""});
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (family) => {
    setIsEditing(true);
    setCurrentFamily(family);
    setFormData({
      familyName: family.family_name || "",
    });
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentFamily(null);
    setFormError("");
    setFormSuccess("");
  };

  const handleInputChange = (e) => {
    setFormData({familyName: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    try {
      const payload = {
        family_name: formData.familyName,
      };

      if (isEditing && currentFamily) {
        await familiesService.update(currentFamily.id, payload);
        setFormSuccess("Familia actualizada exitosamente");
      } else {
        await familiesService.create(payload);
        setFormSuccess("Familia creada exitosamente");
      }

      setTimeout(() => {
        handleCloseModal();
        fetchFamilies();
      }, 1500);
    } catch (error) {
      setFormError(
        error.response?.data?.error ||
          "Error al guardar la familia. Intenta de nuevo.",
      );
    }
  };

  const handleDelete = (id, familyName) => {
    setConfirmDialog({
      open: true,
      title: "Eliminar Familia",
      message: `¿Estás seguro de eliminar la familia "${familyName}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({...prev, open: false}));
        try {
          await familiesService.delete(id);
          fetchFamilies();
        } catch (error) {
          setErrorAlert(
            error.response?.data?.error ||
              "Error al eliminar la familia. Intenta de nuevo.",
          );
        }
      },
    });
  };

  const handleOpenMembersModal = async (family) => {
    setSelectedFamily(family);
    setIsMembersModalOpen(true);

    try {
      // Obtener detalles de la familia con sus miembros
      const familyDetails = await familiesService.getById(family.id);
      setFamilyMembers(familyDetails.members || []);

      // Obtener todos los miembros disponibles
      const allMembers = await membersService.getAll({limit: 1000});
      setAvailableMembers(allMembers.members || []);
    } catch (error) {
      console.error("Error al cargar miembros:", error);
    }
  };

  const handleCloseMembersModal = () => {
    setIsMembersModalOpen(false);
    setSelectedFamily(null);
    setFamilyMembers([]);
    setSelectedMember("");
    setRelationship("MIEMBRO");
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;

    try {
      await familiesService.addMember(selectedFamily.id, {
        member_id: selectedMember,
        relationship: relationship,
      });

      // Recargar miembros de la familia
      const familyDetails = await familiesService.getById(selectedFamily.id);
      setFamilyMembers(familyDetails.members || []);
      setSelectedMember("");
      setRelationship("MIEMBRO");
      fetchFamilies(); // Actualizar contador
    } catch (error) {
      setErrorAlert(error.response?.data?.error || "Error al agregar miembro");
    }
  };

  const handleRemoveMember = (memberId) => {
    setConfirmDialog({
      open: true,
      title: "Remover Miembro",
      message: "¿Deseas remover este miembro de la familia?",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({...prev, open: false}));
        try {
          await familiesService.removeMember(selectedFamily.id, memberId);
          const familyDetails = await familiesService.getById(
            selectedFamily.id,
          );
          setFamilyMembers(familyDetails.members || []);
          fetchFamilies();
        } catch (error) {
          setErrorAlert(
            error.response?.data?.error || "Error al remover miembro",
          );
        }
      },
    });
  };

  const filteredFamilies = families.filter((family) => {
    const name = family.family_name.toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search);
  });

  const goToPage = (page) => {
    setPagination((prev) => ({...prev, page}));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Familias</h1>
          <p className="text-gray-400 mt-2">
            Gestiona las familias de tu iglesia
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nueva Familia
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar familia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Families Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando familias...</p>
        </div>
      ) : filteredFamilies.length === 0 ? (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">No se encontraron familias</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFamilies.map((family) => (
            <Card
              key={family.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-purple-400" />
                    {family.family_name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-gray-300">
                    <UserPlus className="h-4 w-4 mr-2 text-purple-400" />
                    <span className="text-sm">
                      {family.member_count || 0} miembro(s)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => handleOpenMembersModal(family)}
                      variant="outline"
                      size="sm"
                      className="bg-purple-600/10 border-purple-600 text-purple-400 hover:bg-purple-600/20"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Miembros
                    </Button>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(family)}
                        className="p-2 text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(family.id, family.family_name)
                        }
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Anterior
            </Button>
            <Button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onClose={handleCloseModal}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Familia" : "Nueva Familia"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Actualiza el nombre de la familia"
                : "Crea una nueva familia para agrupar miembros"}
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
                Nombre de la Familia *
              </label>
              <Input
                name="familyName"
                value={formData.familyName}
                onChange={handleInputChange}
                required
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ej: Familia González"
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
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                disabled={!!formSuccess}
              >
                {isEditing ? "Actualizar" : "Crear"} Familia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members Modal */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent onClose={handleCloseMembersModal} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Miembros de {selectedFamily?.family_name}</DialogTitle>
            <DialogDescription>
              Gestiona los miembros y relaciones de esta familia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Add Member Section */}
            <div className="bg-slate-700 p-4 rounded-lg space-y-3">
              <h3 className="text-sm font-medium text-white">
                Agregar Miembro
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="">Seleccionar miembro...</option>
                  {availableMembers
                    .filter((m) => !familyMembers.some((fm) => fm.id === m.id))
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                </select>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="PADRE">Padre</option>
                  <option value="MADRE">Madre</option>
                  <option value="HIJO">Hijo/a</option>
                  <option value="MIEMBRO">Miembro</option>
                </select>
              </div>
              <Button
                onClick={handleAddMember}
                disabled={!selectedMember}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Miembro
              </Button>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white">
                Miembros ({familyMembers.length})
              </h3>
              {familyMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No hay miembros en esta familia
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-slate-700 p-3 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-purple-400">
                          {member.relationship}
                        </p>
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
              variant="outline"
              onClick={() => {
                if (!selectedFamily || familyMembers.length === 0) return;
                const html = buildFamilyMembersPDF(
                  selectedFamily,
                  familyMembers,
                  church,
                );
                const win = window.open("", "_blank", "width=960,height=720");
                win.document.write(html);
                win.document.close();
              }}
              disabled={familyMembers.length === 0}
              className="border-slate-600 text-gray-300 hover:text-white hover:border-slate-500 gap-2"
            >
              <Printer className="h-4 w-4" /> PDF
            </Button>
            <Button
              onClick={handleCloseMembersModal}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Alert (fuera de modales, para errores generales) */}
      {errorAlert && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-900/90 border border-red-700 text-red-200 rounded-lg p-4 flex items-center gap-3 shadow-lg max-w-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm flex-1">{errorAlert}</span>
          <button
            onClick={() => setErrorAlert("")}
            className="text-red-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Diálogo de confirmación */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog((prev) => ({...prev, open: false}))
        }
      >
        <DialogContent
          onClose={() => setConfirmDialog((prev) => ({...prev, open: false}))}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={() =>
                setConfirmDialog((prev) => ({...prev, open: false}))
              }
              variant="outline"
              className="bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDialog.onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
