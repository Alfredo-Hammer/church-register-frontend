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
  ChevronLeft,
  ChevronRight,
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

  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((prev) => ({...prev, page: 1}));
      fetchFamilies();
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const params = {page: pagination.page, limit: pagination.limit};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const data = await familiesService.getAll(params);
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

  // La búsqueda ya se aplica en el backend (ver fetchFamilies).
  const filteredFamilies = families;

  const goToPage = (page) => {
    setPagination((prev) => ({...prev, page}));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Familias</h1>
          <p className="text-muted-foreground mt-2">
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
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar familia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Families Table */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              Lista de Familias
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {pagination.total} resultado{pagination.total !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-14">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-muted-foreground mt-4 text-sm">
                Cargando familias...
              </p>
            </div>
          ) : filteredFamilies.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No se encontraron familias</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Familia
                    </th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Miembros
                    </th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredFamilies.map((family, index) => (
                    <tr
                      key={family.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenMembersModal(family)}
                    >
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600/10 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                          </div>
                          <p className="text-foreground text-sm font-medium">
                            {family.family_name}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {family.member_count || 0} miembro
                        {parseInt(family.member_count) !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleOpenMembersModal(family)}
                            className="w-7 h-7 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center transition-colors"
                            title="Ver miembros"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(family)}
                            className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(family.id, family.family_name)
                            }
                            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 flex items-center justify-center transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      variant="outline"
                      size="sm"
                      className="bg-secondary border-border text-foreground hover:bg-accent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      variant="outline"
                      size="sm"
                      className="bg-secondary border-border text-foreground hover:bg-accent"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
              <div className="bg-red-500/10 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-500/10 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg p-3 flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{formSuccess}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Nombre de la Familia *
              </label>
              <Input
                name="familyName"
                value={formData.familyName}
                onChange={handleInputChange}
                required
                className="bg-background border-border text-foreground"
                placeholder="Ej: Familia González"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleCloseModal}
                variant="outline"
                className="bg-background border-border text-muted-foreground hover:bg-accent"
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
            <div className="bg-background p-4 rounded-lg space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Agregar Miembro
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-600"
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
                  className="h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-600"
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
              <h3 className="text-sm font-medium text-foreground">
                Miembros ({familyMembers.length})
              </h3>
              {familyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay miembros en esta familia
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-background p-3 rounded-lg"
                    >
                      <div>
                        <p className="text-foreground font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-purple-700 dark:text-purple-400">
                          {member.relationship}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-red-700 dark:text-red-400 hover:bg-accent rounded-lg transition-colors"
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
              className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2"
            >
              <Printer className="h-4 w-4" /> PDF
            </Button>
            <Button
              onClick={handleCloseMembersModal}
              className="bg-background hover:bg-accent text-foreground"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Alert (fuera de modales, para errores generales) */}
      {errorAlert && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500/10 dark:bg-red-900/90 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg p-4 flex items-center gap-3 shadow-lg max-w-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm flex-1">{errorAlert}</span>
          <button
            onClick={() => setErrorAlert("")}
            className="text-red-700 dark:text-red-300 hover:text-foreground"
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
              className="bg-background border-border text-muted-foreground hover:bg-accent"
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
