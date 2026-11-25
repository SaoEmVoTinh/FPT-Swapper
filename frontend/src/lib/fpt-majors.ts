export interface MajorGroup {
  id: string;
  faculty: string;
  specializations: string[];
}

export const FPT_MAJOR_GROUPS: MajorGroup[] = [
  {
    id: "cntt",
    faculty: "Ngành Công nghệ thông tin",
    specializations: [
      "Công nghệ thông tin",
      "Kỹ thuật phần mềm",
      "Trí tuệ nhân tạo",
      "Khoa học dữ liệu ứng dụng",
      "An toàn thông tin",
      "Thiết kế vi mạch bán dẫn",
      "Công nghệ ô tô số",
      "Hệ thống thông tin",
      "Thiết kế đồ họa và mỹ thuật số",
      "Robot và Trí tuệ nhân tạo (Định hướng UAV và Humanoid)",
    ],
  },
  {
    id: "truyen-thong",
    faculty: "Ngành Công nghệ truyền thông",
    specializations: [
      "Truyền thông đa phương tiện",
      "Quan hệ công chúng",
      "Truyền thông Marketing tích hợp",
      "Truyền thông thương hiệu",
    ],
  },
  {
    id: "ngon-ngu",
    faculty: "Khối Ngành Ngôn ngữ",
    specializations: [
      "Ngôn ngữ Anh",
      "Tiếng Anh thương mại",
      "Ngôn ngữ Hàn Quốc",
      "Tiếng Hàn thương mại",
      "Ngôn ngữ Trung Quốc",
      "Tiếng Trung thương mại",
    ],
  },
  {
    id: "luat",
    faculty: "Ngành Luật",
    specializations: ["Luật", "Luật kinh tế"],
  },
  {
    id: "qtkd",
    faculty: "Ngành Quản trị kinh doanh",
    specializations: [
      "Marketing",
      "Kinh doanh quốc tế",
      "Thương mại điện tử",
      "Quản trị kinh doanh",
      "Quản trị giải trí và sự kiện",
      "Quản trị trải nghiệm khách hàng",
      "Quản trị thu mua",
      "Quản trị khách sạn",
      "Quản trị dịch vụ du lịch và lữ hành",
      "Phân tích kinh doanh (Business Analytics)",
      "Logistics và Quản lý chuỗi cung ứng toàn cầu",
      "Công nghệ tài chính (Fintech)",
      "Tài chính doanh nghiệp",
      "Tài chính thông minh",
      "Tài chính ngân hàng",
    ],
  },
  {
    id: "khmt",
    faculty: "Ngành Khoa học máy tính",
    specializations: [
      "Trí tuệ nhân tạo và Khoa học dữ liệu",
      "An ninh mạng và an toàn số",
    ],
  },
];

export const ALL_SPECIALIZATIONS: string[] = FPT_MAJOR_GROUPS.flatMap(
  (g) => g.specializations
);

export function findFacultyBySpecialization(spec: string): MajorGroup | undefined {
  const normalized = spec.trim().toLowerCase();
  return FPT_MAJOR_GROUPS.find((g) =>
    g.specializations.some((s) => s.toLowerCase() === normalized)
  );
}
