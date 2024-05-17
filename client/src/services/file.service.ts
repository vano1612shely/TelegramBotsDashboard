import { api } from "@/services/api";

class FileService {
  async upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post(`/files/upload`, form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  }
}

const fileService = new FileService();
export default fileService;
