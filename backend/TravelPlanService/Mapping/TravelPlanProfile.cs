using AutoMapper;
using TravelPlanService.Models;
using TravelPlanService.Models.Dtos;
using TravelPlanService.Models.Entities;

namespace TravelPlanService.Mapping;

public class TravelPlanProfile : Profile
{
    public TravelPlanProfile()
    {
        CreateMap<TravelPlanRequestDto, TravelPlan>();
        CreateMap<TravelPlan, TravelPlanResponseDto>();

        CreateMap<DestinationRequestDto, Destination>();
        CreateMap<Destination, DestinationResponseDto>();

        CreateMap<ActivityRequestDto, Activity>()
            .ForMember(dest => dest.Time, opt => opt.MapFrom(src => src.Time!.Value))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => EnumValueParser.ParseActivityStatus(src.Status)));
        CreateMap<Activity, ActivityResponseDto>()
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

        CreateMap<ExpenseRequestDto, Expense>()
            .ForMember(dest => dest.Category, opt => opt.MapFrom(src => EnumValueParser.ParseExpenseCategory(src.Category)));
        CreateMap<Expense, ExpenseResponseDto>()
            .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category.ToString()));

        CreateMap<ChecklistItemRequestDto, ChecklistItem>();
        CreateMap<ChecklistItem, ChecklistItemResponseDto>();

        CreateMap<ShareTokenRequestDto, ShareToken>()
            .ForMember(dest => dest.AccessType, opt => opt.MapFrom(src => Enum.Parse<ShareAccessType>(src.AccessType, true)));
        CreateMap<ShareToken, ShareTokenResponseDto>()
            .ForMember(dest => dest.AccessType, opt => opt.MapFrom(src => src.AccessType.ToString()));
    }
}
