import React, { useState, useEffect } from 'react';

const suggestionsPool = [
  "Lịch sử Việt Nam", "Khám phá không gian", "Lập trình cho người mới bắt đầu", "Đầu tư chứng khoán", "Nấu ăn chay",
  "Chăm sóc cây cảnh trong nhà", "Du lịch bụi Đông Nam Á", "Review phim chiếu rạp", "Học guitar online", "DIY - Tự làm đồ thủ công",
  "Tóm tắt sách kinh doanh", "Fitness tại nhà không cần dụng cụ", "Chơi game sinh tồn (Minecraft, Valheim)", "Hướng dẫn thiền định", "Kỹ năng mềm cho người đi làm",
  "Chăm sóc da khoa học", "Phân tích tâm lý tội phạm", "Sửa chữa đồ điện tử gia dụng", "Kể chuyện ma", "Hướng dẫn sử dụng Excel",
  "Cuộc sống tối giản", "Vẽ tranh màu nước", "Nuôi thú cưng (chó, mèo)", "Lịch sử thế giới", "Thử thách ăn uống",
  "Phượt bằng xe máy", "Bình luận bóng đá", "Học tiếng Anh giao tiếp", "Tài chính cá nhân", "Yoga cho người mới",
  "Trồng rau sân thượng", "Review công nghệ", "Kỹ năng sinh tồn", "Nhiếp ảnh cho người mới", "Làm phim ngắn",
  "Phát triển bản thân", "Phân tích các case study marketing", "Cờ vua cho người mới bắt đầu", "Ảo thuật đường phố", "Cuộc sống ở nước ngoài (Nhật, Hàn, Mỹ...)",
  "Review đồ ăn đường phố", "Luyện giọng nói", "Lịch sử các vị vua Việt Nam", "Tin tức công nghệ hàng tuần", "Đánh giá game mobile",
  "Thời trang nam/nữ", "Kể chuyện lịch sử qua tranh vẽ", "Mẹo vặt cuộc sống", "Tập gym cho người gầy", "Lập kế hoạch và quản lý thời gian",
  "Hướng dẫn làm podcast", "Chế tạo robot mini", "Khám phá các địa điểm bỏ hoang", "Tìm hiểu về các nền văn minh cổ đại", "Phân tích lời bài hát",
  "Thử thách 24h", "Hướng dẫn đầu tư crypto", "Dạy con học tại nhà", "Làm bánh ngọt", "Phân tích giấc mơ",
  "Tập thể dục cho dân văn phòng", "Sửa xe máy cơ bản", "Urban exploring (khám phá đô thị)", "Thần thoại Hy Lạp", "Cách làm video YouTube chuyên nghiệp",
  "Giảm cân khoa học", "Chơi các board game", "Học một ngôn ngữ mới (Nhật, Hàn, Trung)", "Sưu tầm mô hình (gundam, xe hơi)", "Kể chuyện về các vụ án có thật",
  "Đời sống hoang dã", "Phong thủy ứng dụng", "Phản ứng và bình luận video viral", "Xây dựng thương hiệu cá nhân", "Hướng dẫn sử dụng Photoshop/Illustrator",
  "Khám phá khoa học kỳ thú", "Chăm sóc sức khỏe tinh thần", "Mộc - làm đồ gỗ thủ công", "Lịch sử các cuộc chiến tranh", "Thử nghiệm khoa học vui tại nhà",
  "Pha chế cocktail/mocktail", "Sưu tầm tem/tiền cổ", "Review sách self-help", "Hướng dẫn SEO website", "Beatbox cho người mới",
  "Lịch sử thời trang", "Khám phá ẩm thực các vùng miền Việt Nam", "Thử thách sáng tạo nội dung", "Thiết kế nội thất cho nhà nhỏ", "Đọc truyện đêm khuya",
  "So sánh các sản phẩm", "Top 10 khám phá", "Kỹ năng đàm phán", "Street workout (thể dục đường phố)", "Phân tích nhân vật trong phim/truyện",
  "Lịch sử các thương hiệu nổi tiếng", "Dọn dẹp và tổ chức nhà cửa", "Cách trở thành freelancer", "Thử các món ăn kỳ lạ", "Tìm hiểu về vũ trụ và các hành tinh",
  "Làm gốm nghệ thuật", "Học chơi ukulele", "Lịch sử các câu lạc bộ bóng đá", "Khám phá hang động (Caving)", "Thử thách sống không có điện thoại",
  "Làm vườn thủy canh", "Tìm hiểu về thần số học", "Review các ứng dụng di động hữu ích", "Lịch sử âm nhạc (Rock, Pop, Jazz)", "Tự học làm DJ",
  "Du lịch tâm linh (chùa, đền)", "Chế biến cà phê tại nhà (Pour-over, Cold Brew)", "Phân tích chiến thuật game eSports (Liên Minh, Valorant)", "Làm phim hoạt hình stop-motion", "Sáng tạo với Lego",
  "Tìm hiểu về trí tuệ nhân tạo (AI)", "Hướng dẫn tự xuất bản sách", "Cuộc sống của du học sinh", "Các thí nghiệm vật lý đơn giản", "Học calisthenics (tập luyện với trọng lượng cơ thể)",
  "Làm nến thơm handmade", "Khám phá các khu rừng nguyên sinh", "Học ngôn ngữ ký hiệu", "Phân tích các bài phát biểu truyền cảm hứng", "Review các khóa học online",
  "Làm terrarium (hệ sinh thái mini)", "ASMR (âm thanh thư giãn)", "Speed painting (vẽ tranh tốc độ)", "Khám phá quán cà phê độc lạ", "Lịch sử các phát minh vĩ đại",
  "Tự học chơi piano/keyboard", "Chế tạo mô hình giấy (papercraft)", "Bình luận các thuyết âm mưu", "Hướng dẫn làm ảo thuật với bài", "Kể chuyện thần thoại Việt Nam",
  "Du lịch một mình (solo travel)", "Reaction video âm nhạc K-Pop", "Hướng dẫn tự vệ cơ bản", "Phân tích các trận đấu eSports lịch sử", "Làm đồ da thủ công",
  "Thử thách học kỹ năng mới trong 30 ngày", "Sưu tầm và review nước hoa", "Khám phá món ăn vặt tuổi thơ", "Lịch sử và ý nghĩa hình xăm", "DIY trang trí phòng ngủ",
  "Học kalimba (đàn piano ngón tay)", "Phân tích tâm lý nhân vật anime", "Thử thách sống không dùng tiền mặt", "Review mì ăn liền thế giới", "Làm vườn trên ban công",
  "Hướng dẫn nhảy hiện đại/shuffle dance", "Khám phá kiến trúc nổi tiếng", "Lịch sử các vị tướng Việt Nam", "Làm podcast về chuyện cuộc sống", "Sưu tầm giày sneakers",
  "Bí ẩn chưa có lời giải (UFO, Tam giác Bermuda)", "Hướng dẫn sử dụng máy ảnh film", "Thử công thức nấu ăn viral trên TikTok", "Tự tạo font chữ", "Trải nghiệm các công việc lạ",
  "Lịch sử các đế chế (La Mã, Mông Cổ)", "Học beatmaking (sản xuất nhạc beat)", "Review đồ chơi công nghệ độc lạ", "Thử thách 'không chi tiêu'", "Phân tích chiến thuật phim hành động",
  "Làm xà phòng handmade", "Khám phá làng nghề truyền thống", "Kể chuyện thần thoại Bắc Âu", "Hướng dẫn edit video trên điện thoại", "Thử các bài tập thể dục kỳ lạ",
  "Sưu tầm và review đồng hồ", "Lịch sử các môn thể thao", "DIY biến đồ cũ thành đồ mới", "Học cách đọc vị người khác", "Trải nghiệm các lễ hội văn hóa",
  "Phân tích các quảng cáo sáng tạo", "Làm mô hình diorama", "Review các bộ Lego phức tạp", "Lịch sử kinh tế", "Hướng dẫn viết calligraphy",
  "Thử thách đọc 10 cuốn sách/tháng", "Khám phá các loại trà đạo", "Phân tích code của web nổi tiếng", "Làm trang sức thủ công", "Lịch sử hệ điều hành",
  "Thử nghiệm các mẹo hack cuộc sống", "Xây dựng nhà cho thú cưng", "Kể chuyện trinh thám", "Học làm bartender tại nhà", "Phân tích các vụ án mạng nổi tiếng",
  "Làm đồ tái chế từ chai nhựa", "Khám phá các công viên quốc gia", "Lịch sử ngành công nghiệp game", "Thử thách 24h chỉ ăn đồ một màu", "Hướng dẫn sử dụng phần mềm 3D (Blender)",
  "Làm tranh từ rêu (moss art)", "Tìm hiểu về tâm lý học đám đông", "Khám phá các khu chợ đêm", "Lịch sử các hãng xe hơi", "Thử thách nói 'có' với mọi thứ",
  // Adding more diverse ideas
  "Xây dựng PC gaming", "Học vẽ manga/anime", "Sáng tác truyện ngắn", "Làm gốm sứ tại nhà", "Lịch sử điện ảnh",
  "Phân tích thị trường bất động sản", "Trải nghiệm làm nông dân", "Học chơi cờ vây", "DIY dụng cụ học tập", "Kênh podcast về triết học",
  "Review các loại bút máy", "Làm phim tài liệu ngắn", "Chơi các nhạc cụ dân tộc", "Tìm hiểu về blockchain", "Bình luận về các vấn đề xã hội",
  "Kênh về lịch sử ẩm thực", "Sáng tạo nội dung với Green Screen", "Học cách viết kịch bản phim", "Thử thách sống xanh trong 30 ngày", "Deep dive vào thần thoại Ai Cập",
  "Hướng dẫn chơi Rubik", "Làm cosplay nhân vật game", "Review các loại trà sữa", "Khám phá hang Sơn Đoòng (qua video)", "Lịch sử các ban nhạc rock huyền thoại",
  "Tự học marketing kỹ thuật số", "Kênh về sinh vật biển", "Thử thách không dùng mạng xã hội 1 tuần", "DIY đồ nội thất từ gỗ pallet", "Học cách đan len/móc",
  "Phân tích các trận cờ vua kinh điển", "Kênh về thiên văn học", "Làm video time-lapse (thiên nhiên, thành phố)", "Review các quán cà phê sách", "Lịch sử các cuộc cách mạng công nghiệp",
  "Tìm hiểu về tâm linh và huyền bí", "Thử thách tự nấu ăn trong 1 tháng", "Sưu tầm và phục chế đồ cổ", "Kênh về kiến trúc độc đáo", "Học cách làm MC",
  "Phân tích các chiến dịch quảng cáo thành công", "Làm video ASMR nấu ăn", "Thử thách đi bộ 10,000 bước mỗi ngày", "Review các loại bia thủ công", "Lịch sử các loại vũ khí",
  "Kênh về địa lý thế giới", "DIY đồ trang trí lễ hội (Tết, Giáng Sinh)", "Tìm hiểu về các loài khủng long", "Thử thách dọn dẹp theo phương pháp KonMari", "Phân tích ngôn ngữ cơ thể",
  "Kênh về các công trình vĩ đại", "Học làm hoạt hình 2D", "Review các loại tai nghe", "Lịch sử các câu chuyện cổ tích", "Tự làm nước hoa tại nhà",
  "Kênh về các loài chim", "Thử thách đọc sách nói", "Phân tích các vụ mất tích bí ẩn", "DIY hệ thống tưới cây tự động", "Học cách dựng phim chuyên nghiệp (Premiere, DaVinci)",
  "Kênh về côn trùng học", "Lịch sử các loại tiền tệ", "Thử thách chỉ ăn đồ chay trong 1 tháng", "Review các loại bàn phím cơ", "Tìm hiểu về các hiện tượng thiên nhiên kỳ thú",
  "DIY studio tại nhà giá rẻ", "Phân tích các bài hùng biện nổi tiếng", "Kênh về các cuộc thám hiểm lịch sử", "Làm video stop-motion với đất nặn", "Học cách đầu tư vào quỹ ETF",
  "Kênh về các loài nấm", "Lịch sử các trò chơi điện tử", "Thử thách làm thơ mỗi ngày", "Review các ứng dụng học ngoại ngữ", "DIY máy in 3D",
  "Phân tích tâm lý nhân vật trong Harry Potter", "Kênh về các đại dương", "Thử thách tự học một kỹ năng mới trong 1 tuần", "Review các loại rượu vang", "Lịch sử ngành hàng không",
  "Tìm hiểu về giấc mơ sáng suốt (lucid dream)", "DIY các món đồ chơi khoa học", "Phân tích các chiến thuật quân sự", "Kênh về các ngọn núi lửa", "Học cách viết lách sáng tạo",
  "Kênh về các sa mạc trên thế giới", "Lịch sử nghệ thuật (Phục Hưng, Ấn Tượng)", "Thử thách sống với 100 vật dụng", "Review các bộ board game chiến thuật", "DIY đồ dùng cho thú cưng",
  "Phân tích các bộ phim hoạt hình Ghibli", "Kênh về các dòng sông lớn", "Thử thách dậy sớm lúc 5h sáng", "Review các loại sô cô la", "Lịch sử ngành đường sắt",
  "Tìm hiểu về các mật mã và mật mã học", "DIY hệ thống nhà thông minh (smart home)", "Phân tích các vở kịch của Shakespeare", "Kênh về các khu rừng rậm", "Học cách làm một trang web đơn giản",
  "Kênh về các hồ nước ngọt nổi tiếng", "Lịch sử triết học (Khắc kỷ, Hiện sinh)", "Thử thách không mua sắm quần áo trong 1 năm", "Review các bộ dụng cụ đa năng", "DIY kính thiên văn",
  "Phân tích các tác phẩm của H.P. Lovecraft", "Kênh về các vùng cực (Bắc Cực, Nam Cực)", "Thử thách trồng cây từ hạt", "Review các loại phô mai", "Lịch sử ngành nhiếp ảnh"
];

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: string[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const NUMBER_OF_SUGGESTIONS_TO_SHOW = 50;

const InitialSuggestions: React.FC<{ setUserInput: (value: string) => void }> = ({ setUserInput }) => {
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const shuffled = shuffleArray(suggestionsPool);
    setDisplayedSuggestions(shuffled.slice(0, NUMBER_OF_SUGGESTIONS_TO_SHOW));
  }, []);

  return (
    <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-700 rounded-xl">
      <p className="text-xl font-medium">Kết quả phân tích ngách sẽ xuất hiện ở đây.</p>
      <p className="mt-4 mb-4">Bắt đầu bằng cách nhập một ý tưởng, hoặc chọn một trong các gợi ý dưới đây:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {displayedSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => setUserInput(suggestion)}
            className="px-3 py-1 bg-gray-800 text-gray-400 text-sm rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InitialSuggestions;
